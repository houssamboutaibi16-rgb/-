import { Router, Response } from 'express';
import { db } from '../db.ts';
import { OpenRouterService, ChatMessageParam } from '../openrouter.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Chat with Nova AI
router.post('/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'الرسالة مطلوبة' });
    }

    const userId = req.user.id;
    // Save user message
    db.addChatMessage(userId, 'user', message);

    // Retrieve previous chat history for this user
    const history = db.getChatByUser(userId);
    const contextMessages: ChatMessageParam[] = [
      { role: 'system', content: OpenRouterService.getSystemPrompt() },
      ...history.slice(-10).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const userSettings = req.user.settings;
    const completion = await OpenRouterService.complete(contextMessages, {
      userApiKey: userSettings?.openRouterApiKey,
      customModel: userSettings?.customModel,
    });

    // Save assistant reply
    db.addChatMessage(userId, 'assistant', completion.text);

    return res.json({
      reply: completion.text,
      modelUsed: completion.modelUsed,
      provider: completion.provider,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `خطأ في محرك الذكاء الاصطناعي: ${err.message}` });
  }
});

// Get chat history
router.get('/chat-history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const history = db.getChatByUser(req.user.id);
  return res.json({ messages: history });
});

// Clear chat history
router.delete('/chat-history', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  db.clearChat(req.user.id);
  return res.json({ success: true, message: 'تم مسح سجل المحادثة' });
});

// Generate complete structured 9:16 Video Script
router.post('/generate-script', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { topic, seriesId, style = 'educational', language = 'ar', duration = 65 } = req.body;

    if (!topic) {
      return res.status(400).json({ error: 'يرجى كتابة موضوع الفيديو أو الفكرة الأساسية' });
    }

    let seriesContext = '';
    if (seriesId) {
      const series = db.getSeriesById(seriesId, req.user.id);
      if (series) {
        seriesContext = `هذا الفيديو حلقة رقم ${series.currentEpisode + 1} من سلسلة بعنوان "${series.title}"، موضوعها العام: "${series.topic}". حافظ على استمرارية ونبرة السلسلة.`;
      }
    }

    const langName =
      language === 'darija'
        ? 'الدارجة المغربية المفهومة الجذابة'
        : language === 'en'
        ? 'English'
        : 'اللغة العربية الفصحى المبسطة القوية';

    const prompt = `أنت خبير إنتاج فيديوهات Facebook Reels الفيروسية في NovaPulse AI Studio.
المطلوب: توليد سيناريو فيديو عمودي (9:16) مدته تقريباً ${duration} ثانية (بين 60 إلى 90 ثانية).
الموضوع: "${topic}"
الأسلوب: "${style}"
اللغة: ${langName}
${seriesContext}

يجب أن تعيد الناتج بتنسيق JSON حصرياً وصالح بالبنية التالية:
{
  "title": "عنوان جذاب جداً لريلز فيسبوك يثير الفضول",
  "description": "وصف شيق وموجز للفيديو يدعو للمشاهدة والتفاعل",
  "hashtags": ["#NovaPulse", "#ريلز", "#فيسبوك", "#الموضوع1", "#الموضوع2"],
  "hook": "العبارة الافتتاحية الخاطفة في أول 3 ثوانٍ",
  "body": "النص الكامل للمحتوى الإثرائي المشوق",
  "cta": "الدعوة الختامية للتفاعل والمتابعة ومشاركة الفيديو",
  "scenes": [
    {
      "order": 1,
      "narration": "نص الإلقاء الصوتي لهذا المشهد",
      "duration": 12,
      "visualPrompt": "وصف المؤثر البصري والحركة",
      "visualType": "neon_geometry",
      "subtitle": "الترجمة التوضيحية المكتوبة على الشاشة"
    }
  ]
}

ملاحظات:
- مجموع مدد المشاهد (duration) يجب أن يكون بين 60 و 90 ثانية.
- نوع visualType يجب أن يكون حصراً أحد القيم التالية: ["abstract_wave", "particles", "gradient_pulse", "tech_grid", "neon_geometry", "cinematic_flame"].
- استخدم الأرقام الغربية 0 1 2 3 4 5 6 7 8 9 فقط.
- تأكد أن النص غني وقوي ومناسب تماماً لطبيعة ريلز فيسبوك.`;

    const messages: ChatMessageParam[] = [
      { role: 'system', content: 'أنت نظام متقدم لتوليد نصوص وسيناريوهات الفيديوهات بتنسيق JSON فقط.' },
      { role: 'user', content: prompt },
    ];

    const result = await OpenRouterService.complete(messages, {
      userApiKey: req.user.settings?.openRouterApiKey,
      customModel: req.user.settings?.customModel,
      jsonMode: true,
      temperature: 0.7,
    });

    let parsed: any;
    try {
      // Find JSON block if model returned markdown backticks
      let cleanText = result.text.trim();
      if (cleanText.includes('```json')) {
        cleanText = cleanText.split('```json')[1].split('```')[0].trim();
      } else if (cleanText.includes('```')) {
        cleanText = cleanText.split('```')[1].split('```')[0].trim();
      }
      parsed = JSON.parse(cleanText);
    } catch (parseErr) {
      console.warn('Failed to parse model JSON, using robust fallback parser');
      // If parsing fails, create a formatted fallback structure
      parsed = {
        title: topic.substring(0, 50),
        description: `فيديو شيق حول: ${topic} #NovaPulse #Reels`,
        hashtags: ['#NovaPulse', '#Reels', '#فيسبوك', '#ذكاء_اصطناعي'],
        hook: `هل تعلم هذا السر المدهش عن ${topic}؟`,
        body: result.text.substring(0, 300),
        cta: 'شارك رأيك في التعليقات وتابعنا للمزيد!',
        scenes: [
          {
            order: 1,
            narration: `هل تعلم هذا السر المدهش عن ${topic}؟`,
            duration: 15,
            visualPrompt: 'توهج رقمي وأشكال هندسية نيون سريعة',
            visualType: 'neon_geometry',
            subtitle: `سر مدهش حول ${topic}`,
          },
          {
            order: 2,
            narration: result.text.substring(0, 150) || 'الحقيقة التي يجهلها معظم الناس تتغير الآن بسرعة فائقة.',
            duration: 25,
            visualPrompt: 'شبكة بيانات متحركة باللون الأزرق المتألق',
            visualType: 'tech_grid',
            subtitle: 'الحقائق تتبدل بأسرع مما تتخيل',
          },
          {
            order: 3,
            narration: result.text.substring(150, 300) || 'الفرصة بين يديك الآن لتكون في المقدمة دائماً.',
            duration: 25,
            visualPrompt: 'أمواج مجردة ساطعة وأضواء دافئة',
            visualType: 'abstract_wave',
            subtitle: 'كن في الصدارة دائماً',
          },
        ],
      };
    }

    db.addLog(
      req.user.id,
      'ai_generation',
      'توليد سيناريو فيديو',
      `تم توليد سيناريو احترافي لموضوع: "${topic}" (${result.modelUsed})`,
      'success'
    );

    return res.json({
      script: parsed,
      modelUsed: result.modelUsed,
      provider: result.provider,
    });
  } catch (err: any) {
    return res.status(500).json({ error: `فشل توليد السيناريو: ${err.message}` });
  }
});

// Brainstorm viral topics
router.post('/suggest-topics', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { niche = 'ذكاء اصطناعي وتكنولوجيا وتطوير الذات' } = req.body;

    const prompt = `اقترح 5 أفكار لفيديوهات Facebook Reels فيروسية تحقق تفاعلاً عالياً في مجال: "${niche}".
أعد الناتج كـ JSON مصفوفة من العناصر، كل عنصر يحتوي على:
{
  "title": "عنوان ريلز خاطف ومثير",
  "hook": "الخطاف الافتتاحي في أول 3 ثوانٍ",
  "style": "الأسلوب المفضل (educational, dramatic, storytelling, motivational, tech, curiosity)",
  "duration": 65
}
الأرقام غربية 0-9 فقط. أعد JSON فقط.`;

    const result = await OpenRouterService.complete(
      [
        { role: 'system', content: 'أنت خبير أفكار محتوى فيسبوك ريلز. أعد الناتج بصيغة JSON فقط.' },
        { role: 'user', content: prompt },
      ],
      {
        userApiKey: req.user.settings?.openRouterApiKey,
        customModel: req.user.settings?.customModel,
        jsonMode: true,
      }
    );

    let ideas = [];
    try {
      let clean = result.text.trim();
      if (clean.includes('```json')) clean = clean.split('```json')[1].split('```')[0].trim();
      else if (clean.includes('```')) clean = clean.split('```')[1].split('```')[0].trim();
      const parsed = JSON.parse(clean);
      const extracted = Array.isArray(parsed) ? parsed : parsed.ideas || parsed.topics || [];
      if (Array.isArray(extracted) && extracted.length > 0) {
        ideas = extracted;
      } else {
        throw new Error('Empty parsed array');
      }
    } catch {
      ideas = [
        {
          title: '3 أدوات ذكاء اصطناعي مجانية ستجعلك تسبق 99% من الناس',
          hook: 'توقف عن تضييع وقتك! هذه الأدوات تفعل في دقائق ما كان يستغرق أسبوعاً!',
          style: 'tech',
          duration: 65,
        },
        {
          title: 'السر النفسي الذي تستخدمه كبرى الشركات لجذب انتباهك',
          hook: 'هل تساءلت يوماً لماذا تفتح فيسبوك وتبدأ التمرير دون توقف؟',
          style: 'curiosity',
          duration: 70,
        },
        {
          title: 'قاعدة الـ 5 دقائق التي غيرت إنتاجيتي للأبد',
          hook: 'إذا كنت تعاني من التسويف المستمر، فهذا الفيديو سينقذك اليوم!',
          style: 'motivational',
          duration: 60,
        },
        {
          title: 'كيف تبدأ مشروعاً رقمياً بـ 0 دولار في 2026',
          hook: 'لا تحتاج إلى رأس مال لتبدأ، فقط تحتاج إلى هذه الإستراتيجية الذكية!',
          style: 'educational',
          duration: 80,
        },
        {
          title: 'خطأ شائع يرتكبه الجميع عند التعامل مع الذكاء الاصطناعي',
          hook: 'إذا كنت تسأل الذكاء الاصطناعي بهذه الطريقة، فأنت تضيع نصف إمكانياته!',
          style: 'educational',
          duration: 65,
        },
      ];
    }

    return res.json({ ideas, modelUsed: result.modelUsed });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
