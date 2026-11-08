import { Router, Response } from 'express';
import { db } from '../db.ts';
import { FacebookService } from '../facebook.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Get all videos for authenticated user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const videos = db.getVideosByUser(req.user.id);
  return res.json({ videos });
});

// Get single video
router.get('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const video = db.getVideoById(req.params.id, req.user.id);
  if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });
  return res.json({ video });
});

// Create new video draft / generated item
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const video = db.createVideo(req.user.id, req.body);
    return res.status(201).json({ video });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update video
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const updated = db.updateVideo(req.params.id, req.user.id, req.body);
  if (!updated) return res.status(404).json({ error: 'الفيديو غير موجود أو لا تملك صلاحية تعديله' });

  return res.json({ video: updated });
});

// Delete video
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const deleted = db.deleteVideo(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'الفيديو غير موجود' });

  db.addLog(req.user.id, 'system', 'حذف فيديو', 'تم حذف الفيديو من الاستوديو', 'info');
  return res.json({ success: true, message: 'تم حذف الفيديو بنجاح' });
});

// Publish video to Facebook Page via Meta Graph API
router.post('/:id/publish', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const video = db.getVideoById(req.params.id, req.user.id);
  if (!video) return res.status(404).json({ error: 'الفيديو غير موجود' });

  const fb = req.user.facebook;
  if (!fb.connected || !fb.pageId || !fb.pageAccessToken) {
    return res.status(400).json({
      error: 'لم يتم ربط صفحة فيسبوك نشطة بعد، أو انتهت صلاحية الاتصال. يرجى التوجه إلى قسم "ربط فيسبوك" أولاً.',
      needsFacebookSetup: true,
    });
  }

  // Update status to publishing
  db.updateVideo(video.id, req.user.id, { status: 'publishing' });

  // Prepare full caption with hashtags
  const hashtagsStr = (video.hashtags || []).join(' ');
  const fullDescription = `${video.description}\n\n${hashtagsStr}\n\nتم الإنتاج عبر NovaPulse AI Studio 🚀`;

  const publishResult = await FacebookService.publishVideoToPage(fb.pageId, fb.pageAccessToken, {
    title: video.title,
    description: fullDescription,
    videoUrl: video.videoDataUrl || undefined,
  });

  if (!publishResult.success) {
    db.updateVideo(video.id, req.user.id, {
      status: 'failed',
      error: publishResult.error,
    });

    db.addLog(
      req.user.id,
      'error',
      'فشل نشر الفيديو على فيسبوك',
      `خطأ أثناء النشر على صفحة ${fb.pageName}: ${publishResult.error}`,
      'error'
    );

    return res.status(400).json({
      error: publishResult.error,
      details: 'تحقق من صلاحية رمز الصفحة ومنح إذن publish_video أو pages_manage_posts.',
    });
  }

  const fbPostUrl = `https://www.facebook.com/${fb.pageId}/videos/${publishResult.id}`;
  const updatedVideo = db.updateVideo(video.id, req.user.id, {
    status: 'published',
    facebookPostId: publishResult.postId || publishResult.id,
    facebookUrl: fbPostUrl,
    publishedAt: new Date().toISOString(),
    error: undefined,
  });

  db.addLog(
    req.user.id,
    'facebook_publish',
    'نشر فيديو بنجاح على فيسبوك',
    `تم نشر الفيديو "${video.title}" بنجاح على صفحة "${fb.pageName}"`,
    'success'
  );

  return res.json({
    success: true,
    message: `تم نشر الفيديو بنجاح على صفحة "${fb.pageName}"!`,
    video: updatedVideo,
    facebookUrl: fbPostUrl,
  });
});

export default router;
