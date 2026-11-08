import { Router, Response } from 'express';
import { db } from '../db.ts';
import { OpenRouterService, ChatMessageParam } from '../openrouter.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Get all series for authenticated user
router.get('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const series = db.getSeriesByUser(req.user.id);
  return res.json({ series });
});

// Create series
router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { title, description, topic, language = 'ar', style = 'educational', targetDuration = 65 } = req.body;

    if (!title || !topic) {
      return res.status(400).json({ error: 'يرجى إدخال اسم السلسلة والموضوع الرئيسي' });
    }

    const series = db.createSeries(req.user.id, {
      title: title.trim(),
      description: description || '',
      topic: topic.trim(),
      language,
      style,
      targetDuration: Number(targetDuration) || 65,
    });

    return res.status(201).json({ series });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update series
router.put('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const updated = db.updateSeries(req.params.id, req.user.id, req.body);
  if (!updated) return res.status(404).json({ error: 'السلسلة غير موجودة' });

  return res.json({ series: updated });
});

// Delete series
router.delete('/:id', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const deleted = db.deleteSeries(req.params.id, req.user.id);
  if (!deleted) return res.status(404).json({ error: 'السلسلة غير موجودة' });

  return res.json({ success: true, message: 'تم حذف السلسلة بنجاح' });
});

// AI Next Episode Generator for a Series
router.post('/:id/next-episode', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const series = db.getSeriesById(req.params.id, req.user.id);
  if (!series) return res.status(404).json({ error: 'السلسلة غير موجودة' });

  const nextEpNum = series.currentEpisode + 1;

  // Retrieve previous videos in this series to maintain narrative continuity
  const userVideos = db.getVideosByUser(req.user.id);
  const previousSeriesVideos = userVideos
    .filter((v) => v.seriesId === series.id)
    .slice(0, 3)
    .map((v) => `الحلقة ${v.episodeNumber || 1}: ${v.title}`)
    .join('\n');

  const prompt = `أنت الكاتب الإبداعي لسلسلة فيديوهات فيسبوك ريلز بعنوان "${series.title}".
الموضوع العام للسلسلة: "${series.topic}".
الأسلوب: "${series.style}".
المطلوب: كتابة وتخطيط الحلقة القادمة (الحلقة رقم ${nextEpNum}).
الحلقات السابقة:
${previousSeriesVideos || 'هذه هي الحلقة الأولى في السلسلة.'}

يجب أن تحافظ على تسلسل الأحداث والشغف والربط الذكي بالحلقات السابقة والقادمة.
أعد الناتج كـ JSON فقط بالبنية التالية:
{
  "title": "${series.title} | الحلقة ${nextEpNum}: [عنوان مشوق للحلقة]",
  "description": "وصف شيق للحلقة رقم ${nextEpNum} مع دعوة لمتابعة السلسلة #NovaPulse #ريلز",
  "hashtags": ["#NovaPulse", "#${series.title.replace(/\\s+/g, '_')}", "#ريلز_فيسبوك", "#الحلقة_${nextEpNum}"],
  "hook": "الخطاف الافتتاحي في أول 3 ثوانٍ يربط المشاهد بالسلسلة",
  "body": "المحتوى الأساسي للحلقة",
  "cta": "انتظروا الحلقة القادمة واشتركوا في الصفحة لمتابعة السلسلة كاملة!",
  "scenes": [
    {
      "order": 1,
      "narration": "نص الإلقاء الصوتي للمشهد الأول",
      "duration": 15,
      "visualPrompt": "وصف حركة المشهد وخلفيته",
      "visualType": "tech_grid",
      "subtitle": "الترجمة على الشاشة"
    },
    {
      "order": 2,
      "narration": "نص الإلقاء الصوتي للمشهد الثاني",
      "duration": 20,
      "visualPrompt": "وصف المشهد الثاني",
      "visualType": "neon_geometry",
      "subtitle": "الترجمة على الشاشة"
    },
    {
      "order": 3,
      "narration": "نص الإلقاء الصوتي للمشهد الثالث والختامي",
      "duration": 25,
      "visualPrompt": "وصف المشهد الثالث",
      "visualType": "abstract_wave",
      "subtitle": "الترجمة على الشاشة"
    }
  ]
}`;

  try {
    const messages: ChatMessageParam[] = [
      { role: 'system', content: 'أنت نظام ذكي لتأليف سلاسل المحتوى. رد بـ JSON صالح فقط.' },
      { role: 'user', content: prompt },
    ];

    const result = await OpenRouterService.complete(messages, {
      userApiKey: req.user.settings?.openRouterApiKey,
      customModel: req.user.settings?.customModel,
      jsonMode: true,
    });

    let script: any;
    try {
      let clean = result.text.trim();
      if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
      else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
      script = JSON.parse(clean);
    } catch {
      script = {
        title: `${series.title} | الحلقة ${nextEpNum}: المفاجأة الكبرى`,
        description: `شاهد الحلقة ${nextEpNum} من سلسلة ${series.title}!`,
        hashtags: ['#NovaPulse', '#Reels', '#فيسبوك'],
        hook: `مرحباً بكم في الحلقة ${nextEpNum} من سلسلة ${series.title}!`,
        body: result.text.substring(0, 300),
        cta: 'تابعونا للحلقة القادمة!',
        scenes: [
          {
            order: 1,
            narration: `مرحباً بكم في الحلقة ${nextEpNum} من سلسلة ${series.title}!`,
            duration: 15,
            visualPrompt: 'انتقال سريع وشعار متوهج',
            visualType: 'neon_geometry',
            subtitle: `الحلقة ${nextEpNum}: ${series.title}`,
          },
          {
            order: 2,
            narration: result.text.substring(0, 150) || 'في هذه الحلقة نكشف جانباً غير مسبوق في هذا الموضوع.',
            duration: 25,
            visualPrompt: 'موجات ملونة وخطوط متوهجة',
            visualType: 'abstract_wave',
            subtitle: 'اكتشافات مذهلة ومعلومات حصرية',
          },
          {
            order: 3,
            narration: result.text.substring(150, 300) || 'ترقبوا الحلقة القادمة التي ستغير كل الموازين!',
            duration: 25,
            visualPrompt: 'انفجار جسيمات سينمائي دافئ',
            visualType: 'particles',
            subtitle: 'المزيد في الحلقة القادمة!',
          },
        ],
      };
    }

    // Automatically create video item linked to this series
    const newVideo = db.createVideo(req.user.id, {
      seriesId: series.id,
      seriesTitle: series.title,
      episodeNumber: nextEpNum,
      title: script.title || `${series.title} - الحلقة ${nextEpNum}`,
      description: script.description || '',
      hashtags: script.hashtags || ['#NovaPulse', '#Reels'],
      duration: series.targetDuration || 65,
      status: 'ready',
      script: {
        hook: script.hook || '',
        body: script.body || '',
        cta: script.cta || '',
        scenes: script.scenes || [],
      },
    });

    db.addLog(
      req.user.id,
      'ai_generation',
      'توليد حلقة جديدة في السلسلة',
      `تم توليد الحلقة ${nextEpNum} بنجاح لسلسلة "${series.title}"`,
      'success'
    );

    return res.status(201).json({
      video: newVideo,
      series: db.getSeriesById(series.id, req.user.id),
      message: `تم توليد الحلقة ${nextEpNum} بنجاح!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `فشل توليد الحلقة: ${err.message}` });
  }
});

export default router;
