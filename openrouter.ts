import { GoogleGenAI } from '@google/genai';

export interface OpenRouterConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface ChatMessageParam {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Fallback chain for free OpenRouter models
const FREE_MODELS = [
  'openrouter/free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

const DEFAULT_BASE_URL = process.env.NOVA_AI_BASE_URL || 'https://openrouter.ai/api/v1';

export class OpenRouterService {
  private static geminiClient: GoogleGenAI | null = null;

  private static getGemini() {
    const key = process.env.GEMINI_API_KEY;
    if (!this.geminiClient && key && key !== 'MY_GEMINI_API_KEY' && key.length > 10) {
      this.geminiClient = new GoogleGenAI({ apiKey: key });
    }
    return this.geminiClient;
  }

  /**
   * Main completion method that calls OpenRouter, tries free fallbacks,
   * and falls back to Gemini if configured, ensuring 100% uptime without paid fees.
   */
  static async complete(
    messages: ChatMessageParam[],
    options: {
      userApiKey?: string;
      customModel?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<{ text: string; modelUsed: string; provider: 'openrouter' | 'gemini' | 'fallback' }> {
    const apiKey = options.userApiKey || process.env.NOVA_AI_API_KEY || process.env.OPENROUTER_API_KEY;
    const requestedModel = options.customModel || process.env.NOVA_AI_MODEL || 'openrouter/free';

    // If an OpenRouter API key is provided, attempt OpenRouter with fallback models
    if (apiKey) {
      const modelsToTry = [
        requestedModel,
        ...FREE_MODELS.filter((m) => m !== requestedModel),
      ];

      for (const model of modelsToTry) {
        try {
          const response = await fetch(`${DEFAULT_BASE_URL}/chat/completions`, {
            method: 'POST',
            signal: AbortSignal.timeout(6000),
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': process.env.APP_URL || 'https://novapulse.aistudio.app',
              'X-Title': 'NovaPulse AI Studio',
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: options.temperature ?? 0.7,
              max_tokens: options.maxTokens ?? 2000,
              response_format: options.jsonMode ? { type: 'json_object' } : undefined,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data?.choices?.[0]?.message?.content || '';
            if (text) {
              return { text, modelUsed: model, provider: 'openrouter' };
            }
          } else {
            const errorText = await response.text();
            console.warn(`OpenRouter model ${model} failed (${response.status}):`, errorText);
            // If rate limit (429) or model unavailable, continue to next model in loop
          }
        } catch (err: any) {
          console.warn(`OpenRouter network error with ${model}:`, err.message);
        }
      }
    }

    // Secondary fallback: Gemini API if available in environment
    const gemini = this.getGemini();
    if (gemini) {
      try {
        const systemMsg = messages.find((m) => m.role === 'system')?.content || '';
        const userAndAssistant = messages
          .filter((m) => m.role !== 'system')
          .map((m) => `${m.role === 'assistant' ? 'Model' : 'User'}: ${m.content}`)
          .join('\n\n');

        const prompt = systemMsg
          ? `${systemMsg}\n\n${userAndAssistant}`
          : userAndAssistant;

        const res = await gemini.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: options.temperature ?? 0.7,
            responseMimeType: options.jsonMode ? 'application/json' : 'text/plain',
          },
        });

        const text = res.text || '';
        if (text) {
          return { text, modelUsed: 'gemini-3.8-flash', provider: 'gemini' };
        }
      } catch (geminiErr: any) {
        console.warn('Gemini fallback attempt failed:', geminiErr.message);
      }
    }

    // Intelligent local fallback if no active API key has quota right now
    return {
      text: this.generateSmartLocalFallback(messages, options.jsonMode),
      modelUsed: 'NovaPulse Local Engine (Offline-Safe)',
      provider: 'fallback',
    };
  }

  /**
   * Deterministic creative template engine used when external free API tokens are offline or pending setup
   */
  private static generateSmartLocalFallback(messages: ChatMessageParam[], jsonMode = false): string {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content || '';

    if (jsonMode) {
      return JSON.stringify({
        title: 'أسرار النجاح والذكاء الاصطناعي في 60 ثانية',
        description: 'اكتشف كيف يغير الذكاء الاصطناعي العالم اليوم وماذا تحتاج لتبدأ خطوتك الأولى! 🚀 #NovaPulse #Reels #فيسبوك',
        hashtags: ['#NovaPulse', '#ريلز_فيسبوك', '#ذكاء_اصطناعي', '#تطوير_الذات', '#تكنولوجيا'],
        hook: 'هل تساءلت يوماً لماذا يتقدم البعض بسرعة بينما يقف الآخرون في مكانهم؟ السر يكمن في خطوة واحدة!',
        body: 'في عالم يتسارع كل ثانية، الأدوات الرقمية أصبحت تصنع الفارق الحقيقي. من تنظيم وقتك إلى إنجاز أعمالك بذكاء. الأذكياء لا يعملون بجهد مضاعف، بل بأدوات أذكى.',
        cta: 'شارك هذا الفيديو مع صديق يحتاج لسماع هذه الكلمات، واشترك في الصفحة للمزيد من المحتوى المميز!',
        scenes: [
          {
            order: 1,
            narration: 'هل تساءلت يوماً لماذا يتقدم البعض بسرعة بينما يقف الآخرون في مكانهم؟',
            duration: 12,
            visualPrompt: 'انتقال سينمائي وضوء نيون رقمي مع حركة ديناميكية تجذب الانتباه',
            visualType: 'neon_geometry',
            subtitle: 'هل تساءلت يوماً عن سر التقدم السريع؟',
          },
          {
            order: 2,
            narration: 'السر ليس في العمل الشاق فقط، بل في استخدام الأدوات الحديثة بذكاء واحترافية.',
            duration: 16,
            visualPrompt: 'شبكة تكنولوجية متصلة وجسيمات بيانات متوهجة باللون الأزرق والبنفسجي',
            visualType: 'tech_grid',
            subtitle: 'العمل الذكي يتفوق دائماً على الجهد العشوائي',
          },
          {
            order: 3,
            narration: 'من تنظيم أولوياتك إلى تسخير الذكاء الاصطناعي لإنجاز مهامك في دقائق معدودة.',
            duration: 18,
            visualPrompt: 'موجات طاقة متدفقة ترمز للسرعة والإنجاز المتواصل',
            visualType: 'abstract_wave',
            subtitle: 'حوّل ساعات العمل إلى دقائق من الإنجاز',
          },
          {
            order: 4,
            narration: 'ابدأ اليوم ولا تنتظر الغد، لأن الفرص لا تنتظر المترددين!',
            duration: 14,
            visualPrompt: 'توهج ذهبي وانفجار جزيئات سينمائي احتفالي',
            visualType: 'particles',
            subtitle: 'ابدأ الآن.. فرصتك تصنعها بنفسك!',
          },
        ],
      });
    }

    return `مرحباً بك! أنا Nova AI، المساعد الذكي لاستوديو NovaPulse AI Studio.
أستطيع مساعدتك في التخطيط، كتابة السيناريوهات، واقتراح أفكار فيسبوك ريلز باللغة العربية الفصحى أو الدارجة المغربية والإنجليزية.

طلبك حول: "${lastUserMsg.substring(0, 50)}..."
💡 اقتراحي الفوري لك:
1. لنبدأ بصياغة "Hook" خاطف في أول 3 ثوانٍ يثير فضول المشاهد على فيسبوك.
2. نركّز على رسالة واحدة قوية ومختصرة تناسب مدة 60-90 ثانية.
3. ننهي الفيديو بـ Call To Action تفاعلي لمضاعفة المشاركات والتعليقات.

هل تود أن أقوم بإنشاء سيناريو كامل مقسم لمشاهد الآن؟`;
  }

  /**
   * System Prompt tailored for Nova AI Facebook Reels generation
   */
  static getSystemPrompt(): string {
    return `أنت Nova AI، المساعد الذكي الحصري لمنصة NovaPulse AI Studio المتخصصة في التخطيط والإنتاج التلقائي لفيديوهات Facebook Reels القصيرة (9:16).
قواعد العمل الأساسية:
1. تتحدث باللغة العربية بطلاقة، وتفهم وتتجاوب بالدارجة المغربية أو الإنجليزية إذا طلب المستخدم.
2. تخصصك هو فيديوهات فيسبوك ريلز العمودية (9:16) ذات المدة بين 60 إلى 90 ثانية.
3. تركز على هيكل الفيديوهات الفيروسية (Viral Hooks, Strong Value, Powerful CTA).
4. تحافظ دائماً على سياق المحادثة وتساعد المستخدم في إدارة سلاسله والمهام المعلقة.
5. الأرقام تكتب دائماً بصيغتها الغربية (0 1 2 3 4 5 6 7 8 9).
6. عندما يُطلب منك سيناريو فيديو أو تقسيم مشاهد، قدم نصوصاً مشوقة، معبرة، مناسبة للإلقاء الصوتي، وترجمة واضحة للمشاهد.`;
  }
}
