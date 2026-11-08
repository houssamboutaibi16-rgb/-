import { Router, Response } from 'express';
import { db } from '../db.ts';
import { FacebookService } from '../facebook.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Get queue for authenticated user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const queue = db.getQueueByUser(req.user.id);
  return res.json({ queue });
});

// Add video to queue
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { videoId, scheduledTime } = req.body;
    if (!videoId || !scheduledTime) {
      return res.status(400).json({ error: 'يرجى تحديد الفيديو ووقت الجدولة' });
    }

    const video = db.getVideoById(videoId, req.user.id);
    if (!video) {
      return res.status(404).json({ error: 'الفيديو غير موجود' });
    }

    const item = db.addToQueue(req.user.id, videoId, scheduledTime);
    return res.status(201).json({ queueItem: item, message: 'تمت إضافة الفيديو إلى جدول النشر بنجاح' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Delete queue item
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const deleted = db.deleteQueueItem(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'عنصر الانتظار غير موجود' });

  return res.json({ success: true, message: 'تم حذف موعد النشر بنجاح' });
});

// Retry failed item
router.post('/:id/retry', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const queueItems = db.getQueueByUser(req.user.id);
  const item = queueItems.find((q) => q.id === req.params.id);

  if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });

  db.updateQueueItem(item.id, req.user.id, {
    status: 'pending',
    attempts: (item.attempts || 0) + 1,
    lastAttempt: new Date().toISOString(),
    errorMessage: undefined,
  });

  return res.json({ success: true, message: 'تمت إعادة تعيين المهمة للمحاولة مجدداً' });
});

// Process due items in the queue for this user
router.post('/process-due', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const queue = db.getQueueByUser(req.user.id);
  const now = new Date();
  const dueItems = queue.filter(
    (q) => q.status === 'pending' && new Date(q.scheduledTime) <= now
  );

  if (dueItems.length === 0) {
    return res.json({ processedCount: 0, message: 'لا توجد فيديوهات مستحقة النشر في الوقت الحالي' });
  }

  const fb = req.user.facebook;
  if (!fb.connected || !fb.pageId || !fb.pageAccessToken) {
    return res.status(400).json({
      error: 'لا يمكن نشر الفيديوهات المستحقة: صفحة فيسبوك غير متصلة بحسابك',
      needsFacebookSetup: true,
    });
  }

  const results: any[] = [];

  for (const item of dueItems) {
    const video = db.getVideoById(item.videoId, req.user.id);
    if (!video) {
      db.updateQueueItem(item.id, req.user.id, {
        status: 'failed',
        errorMessage: 'الفيديو غير موجود في قاعدة البيانات',
      });
      continue;
    }

    db.updateQueueItem(item.id, req.user.id, { status: 'processing' });
    db.updateVideo(video.id, req.user.id, { status: 'publishing' });

    const publishResult = await FacebookService.publishVideoToPage(
      fb.pageId,
      fb.pageAccessToken,
      {
        title: video.title,
        description: `${video.description}\n\n${(video.hashtags || []).join(' ')}`,
      }
    );

    if (publishResult.success) {
      const fbPostUrl = `https://www.facebook.com/${fb.pageId}/videos/${publishResult.id}`;
      db.updateVideo(video.id, req.user.id, {
        status: 'published',
        facebookPostId: publishResult.postId || publishResult.id,
        facebookUrl: fbPostUrl,
        publishedAt: new Date().toISOString(),
      });
      db.updateQueueItem(item.id, req.user.id, {
        status: 'completed',
        lastAttempt: new Date().toISOString(),
      });
      db.addLog(
        req.user.id,
        'facebook_publish',
        'نشر تلقائي مجدول',
        `تم النشر التلقائي للفيديو "${video.title}" على صفحة "${fb.pageName}"`,
        'success'
      );
      results.push({ videoId: video.id, title: video.title, status: 'published' });
    } else {
      db.updateVideo(video.id, req.user.id, {
        status: 'failed',
        error: publishResult.error,
      });
      db.updateQueueItem(item.id, req.user.id, {
        status: 'failed',
        errorMessage: publishResult.error,
        attempts: (item.attempts || 0) + 1,
        lastAttempt: new Date().toISOString(),
      });
      results.push({ videoId: video.id, title: video.title, status: 'failed', error: publishResult.error });
    }
  }

  return res.json({
    processedCount: results.length,
    results,
    message: `تمت معالجة ${results.length} مهام نشر مجدولة`,
  });
});

export default router;
