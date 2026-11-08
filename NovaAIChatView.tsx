import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User as UserIcon, Sparkles, Trash2, ArrowLeft, Wand2 } from 'lucide-react';
import { ChatMessage } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface NovaAIChatViewProps {
  onOpenStudioWithTopic?: (topic: string) => void;
}

export const NovaAIChatView: React.FC<NovaAIChatViewProps> = ({ onOpenStudioWithTopic }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelUsed, setModelUsed] = useState<string>('openrouter/free');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const defaultWelcomeMessage: ChatMessage = {
    id: 'welcome',
    userId: 'system',
    role: 'assistant',
    content: `مرحباً بك! أنا **Nova AI**، مساعدك الذكي الحصري في NovaPulse AI Studio 🚀
أنا هنا لمساعدتك في:
• التخطيط لفيديوهات Facebook Reels الفيروسية (9:16).
• كتابة سيناريوهات مشوقة مدتها 60-90 ثانية بالعربية الفصحى أو الدارجة المغربية والإنجليزية.
• اقتراح أفكار سلاسل محتوى مستمرة تزيد التفاعل على صفحتك.

عن ماذا تريد أن ننتج فيديو اليوم؟`,
    timestamp: new Date().toISOString(),
  };

  const loadHistory = async () => {
    if (!user) {
      setMessages([defaultWelcomeMessage]);
      return;
    }
    try {
      const msgs = await api.getChatHistory();
      if (msgs.length === 0) {
        setMessages([defaultWelcomeMessage]);
      } else {
        setMessages(msgs);
      }
    } catch (err: any) {
      console.warn('Chat history notification:', err.message);
      setMessages([defaultWelcomeMessage]);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    setInput('');
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: 'me',
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setLoading(true);

    try {
      const res = await api.sendChatMessage(text);
      setModelUsed(res.modelUsed);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        userId: 'assistant',
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        userId: 'assistant',
        role: 'assistant',
        content: `عذراً، حدث خطأ أثناء الاتصال بالذكاء الاصطناعي: ${err.message}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('هل أنت متأكد من مسح سجل المحادثة؟')) return;
    await api.clearChatHistory();
    setMessages([]);
    loadHistory();
  };

  const quickPrompts = [
    'اقترح 5 أفكار ريلز فيسبوك فيروسية ومبتكرة',
    'اكتب سيناريو 60 ثانية بالدارجة المغربية عن بدء عمل رقمي',
    'أعطني خطافات افتتاحية (Hooks) خارقة لأول 3 ثوانٍ',
    'خطط لسلسلة تعليمية من 5 حلقات عن أدوات الذكاء الاصطناعي',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto rounded-3xl bg-slate-900/70 border border-slate-800 overflow-hidden shadow-2xl">
      {/* Top Chat Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Nova AI</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
                {modelUsed}
              </span>
            </div>
            <p className="text-xs text-slate-400">مساعد التخطيط والسيناريوهات (عربية • دارجة • English)</p>
          </div>
        </div>

        <button
          onClick={handleClear}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-700/60 transition"
          title="مسح المحادثة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-cyan-600 text-white rounded-tr-xs'
                    : 'bg-slate-800/90 border border-slate-700/70 text-slate-200 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Quick Convert to Video Studio button on assistant replies */}
                {!isUser && onOpenStudioWithTopic && msg.content.length > 50 && (
                  <div className="mt-3 pt-3 border-t border-slate-700/60 flex items-center justify-end">
                    <button
                      onClick={() => onOpenStudioWithTopic(msg.content.substring(0, 150))}
                      className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/60 hover:bg-cyan-900/60 px-3 py-1.5 rounded-lg border border-cyan-800/40 transition"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      تحويل هذه الفكرة إلى فيديو 9:16 في الاستوديو
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl px-4 py-3 flex items-center gap-2 text-xs text-cyan-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
              Nova AI يفكر ويصيغ الرد...
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Suggestions */}
      <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {quickPrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="text-[11px] whitespace-nowrap px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اسأل Nova AI، اطلب فكرة ريلز، أو اكتب موضوعاً لتوليد سيناريو..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Send className="w-4 h-4 rotate-180" />
          </button>
        </form>
      </div>
    </div>
  );
};
