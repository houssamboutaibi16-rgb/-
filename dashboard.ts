import { Router, Response } from 'express';
import { db } from '../db.ts';
import { OpenRouterService, ChatMessageParam } from '../openrouter.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Get dashboard statistics strictly for authenticated user
router.get('/stats', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const stats = db.getDashboardStats(req.user.id);
  return res.json({ stats });
});

// Get recent activity logs for authenticated user
router.get('/logs', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const limit = Number(req.query.limit) || 40;
  const logs = db.getLogsByUser(req.user.id, limit);
  return res.json({ logs });
});

// Toggle auto-production engine on/off
router.post('/toggle-auto', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const currentStatus = req.user.settings?.autoProduceEnabled || false;
  const newStatus = !currentStatus;

  const updated = db.updateUser(req.user.id, {
    settings: {
      ...req.user.settings,
      autoProduceEnabled: newStatus,
    },
  });

  db.addLog(
    req.user.id,
    'system',
    newStatus ? 'تشغيل نظام الإنتاج التلقائي' : 'إيقاف نظام الإنتاج التلقائي مؤقتاً',
    newStatus
      ? 'سيعمل النظام الآن على جدولة إنتاج ونشر الفيديوهات تلقائياً وفق الهدف اليومي'
      : 'تم إيقاف الإنتاج التلقائي مؤقتاً',
    newStatus ? 'success' : 'info'
  );

  return res.json({
    autoProduceEnabled: newStatus,
    message: newStatus ? 'تم تفعيل الإنتاج التلقائي بنجاح 🚀' : 'تم إيقاف الإنتاج التلقائي مؤقتاً ⏸️',
    user: db.getSafeUser(updated!),
  });
});

// Trigger an automatic production batch
router.post('/trigger-auto-batch', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const userId = req.user.id;
    const seriesList = db.getSeriesByUser(userId);
    const targetCount = req.user.settings?.dailyTarget || 2;
    const generatedVideos: any[] = [];

    // Process up to targetCount (min 1, max 2 in one manual run)
    const countToProduce = Math.min(Math.max(1, targetCount), 2);

    for (let i = 0; i < countToProduce; i++) {
      let topic = '';
      let seriesId: string | undefined = undefined;
      let seriesTitle: string | undefined = undefined;
      let episodeNumber: number | undefined = undefined;

      if (seriesList.length > 0) {
        // Rotate series or pick first
        const activeSeries = seriesList[i % seriesList.length];
        seriesId = activeSeries.id;
        seriesTitle = activeSeries.title;
        episodeNumber = activeSeries.currentEpisode + 1;
        topic = `الحلقة ${episodeNumber} من سلسلة ${activeSeries.title} حول موضوع: ${activeSeries.topic}`;
      } else {
        const topics = [
          '5 خطوات لاختصار 10 ساعات عمل أسبوعياً بأدوات الذكاء الاصطناعي',
          'السر الذي لا يخبرك به المحترفون لبناء دخل رقمي مستدام',
          'كيف تحافظ على تركيزك وإنتاجيتك في عصر التشتت الرقمي',
        ];
        topic = topics[i % topics.length];
      }

      // Generate script with Nova AI
      const prompt = `أنت في وضع الإنتاج التلقائي لـ NovaPulse AI Studio.
المطلوب: إنتاج سيناريو فيديو Facebook Reels جذاب ومدته بين 60 إلى 75 ثانية.
الموضوع: "${topic}"
أعد ناتج JSON فقط بالبنية:
{
  "title": "عنوان جذاب جداً",
  "description": "وصف شيق مع هاشتاغات فيسبوك",
  "hashtags": ["#NovaPulse", "#ريلز", "#فيسبوك", "#ذكاء_اصطناعي"],
  "hook": "الخطاف الافتتاحي في أول 3 ثوانٍ",
  "body": "المحتوى الأساسي",
  "cta": "الدعوة الختامية للتفاعل والمشاركة",
  "scenes": [
    {
      "order": 1,
      "narration": "نص الإلقاء الصوتي",
      "duration": 15,
      "visualPrompt": "وصف المشهد",
      "visualType": "tech_grid",
      "subtitle": "ترجمة المشهد"
    },
    {
      "order": 2,
      "narration": "نص الإلقاء الصوتي 2",
      "duration": 25,
      "visualPrompt": "وصف المشهد 2",
      "visualType": "neon_geometry",
      "subtitle": "ترجمة المشهد 2"
    },
    {
      "order": 3,
      "narration": "نص الإلقاء الصوتي 3",
      "duration": 25,
      "visualPrompt": "وصف المشهد 3",
      "visualType": "abstract_wave",
      "subtitle": "ترجمة المشهد 3"
    }
  ]
}`;

      const completion = await OpenRouterService.complete(
        [
          { role: 'system', content: 'أنت محرك الإنتاج التلقائي في NovaPulse. أعد JSON فقط.' },
          { role: 'user', content: prompt },
        ],
        {
          userApiKey: req.user.settings?.openRouterApiKey,
          customModel: req.user.settings?.customModel,
          jsonMode: true,
        }
      );

      let parsed: any;
      try {
        let clean = completion.text.trim();
        if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
        else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
        parsed = JSON.parse(clean);
      } catch {
        parsed = {
          title: topic,
          description: `محتوى تلقائي احترافي: ${topic}`,
          hashtags: ['#NovaPulse', '#Reels', '#ذكاء_اصطناعي'],
          hook: 'هل تبحث عن الطريقة الأذكى لإنجاز المزيد في وقت أقل؟',
          body: 'هذا ما اكتشفه رواد الأعمال والمطورون مؤخراً...',
          cta: 'تابع الصفحة للمزيد من النصائح اليومية!',
          scenes: [
            {
              order: 1,
              narration: 'هل تبحث عن الطريقة الأذكى لإنجاز المزيد في وقت أقل؟',
              duration: 15,
              visualPrompt: 'انتقال تكنولوجي سريع',
              visualType: 'neon_geometry',
              subtitle: 'الطريقة الأذكى للإنجاز',
            },
            {
              order: 2,
              narration: 'الأدوات الرقمية تمنحك اليوم قدرات خارقة إذا أحسنت استغلالها.',
              duration: 25,
              visualPrompt: 'شبكة ذكاء اصطناعي مضيئة',
              visualType: 'tech_grid',
              subtitle: 'استغل قوة التكنولوجيا الحديثة',
            },
            {
              order: 3,
              narration: 'ابدأ بخطوة واحدة اليوم وسترى الفارق خلال أسبوع واحد!',
              duration: 25,
              visualPrompt: 'أمواج مجردة سينمائية',
              visualType: 'abstract_wave',
              subtitle: 'الخطوة الأولى تصنع الفارق',
            },
          ],
        };
      }

      // Create video item
      const video = db.createVideo(userId, {
        seriesId,
        seriesTitle,
        episodeNumber,
        title: parsed.title || topic,
        description: parsed.description || '',
        hashtags: parsed.hashtags || ['#NovaPulse', '#Reels'],
        duration: 65,
        status: 'ready',
        script: {
          hook: parsed.hook || '',
          body: parsed.body || '',
          cta: parsed.cta || '',
          scenes: parsed.scenes || [],
        },
      });

      // Calculate schedule time based on user settings
      const publishTimes = req.user.settings?.publishTimes || ['14:00', '20:00'];
      const targetTimeStr = publishTimes[i % publishTimes.length] || '18:00';
      const [hours, minutes] = targetTimeStr.split(':').map(Number);
      const scheduledDate = new Date();
      scheduledDate.setHours(hours || 18, minutes || 0, 0, 0);

      // If time passed today, schedule for tomorrow
      if (scheduledDate <= new Date()) {
        scheduledDate.setDate(scheduledDate.getDate() + 1);
      }

      // Add to publishing queue
      db.addToQueue(userId, video.id, scheduledDate.toISOString());
      generatedVideos.push(video);
    }

    db.addLog(
      userId,
      'ai_generation',
      'إنهاء دفعة إنتاج تلقائي',
      `تم إنتاج ${generatedVideos.length} فيديو بنجاح وإدراجها في جدول النشر`,
      'success'
    );

    return res.json({
      success: true,
      count: generatedVideos.length,
      videos: generatedVideos,
      message: `تم إنتاج ${generatedVideos.length} فيديوهات بنجاح وإدراجها في جدول النشر! 🎉`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `فشل تشغيل دفعة الإنتاج التلقائي: ${err.message}` });
  }
});

export default router;
