import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  Bot,
  Key,
  Clock,
  Save,
  CheckCircle2,
  Shield,
  Sparkles,
  Download,
  Archive,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';

export const SettingsView: React.FC = () => {
  const { user, updateProfile, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [customModel, setCustomModel] = useState(user?.settings?.customModel || 'openrouter/free');
  const [dailyTarget, setDailyTarget] = useState(user?.settings?.dailyTarget || 2);
  const [publishTime1, setPublishTime1] = useState(user?.settings?.publishTimes?.[0] || '14:00');
  const [publishTime2, setPublishTime2] = useState(user?.settings?.publishTimes?.[1] || '20:00');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const settingsUpdates: any = {
        customModel,
        dailyTarget: Number(dailyTarget),
        publishTimes: [publishTime1, publishTime2],
      };

      if (openRouterKey.trim()) {
        settingsUpdates.openRouterApiKey = openRouterKey.trim();
      }

      await updateProfile({
        name: name.trim(),
        settings: settingsUpdates,
      });

      setSaveSuccess(true);
      setOpenRouterKey('');
      await refreshUser();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-black text-white">إعدادات الحساب ومحرك الذكاء</h1>
        </div>
        <p className="text-xs text-slate-400">
          تخصيص المفاتيح الشخصية، خيارات النماذج، والجدول الزمني للإنتاج التلقائي.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>تم حفظ الإعدادات بنجاح وتحديث إعدادات حسابك!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile Details */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <UserIcon className="w-4 h-4 text-cyan-400" />
            بيانات الملف الشخصي
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">الاسم الكامل</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">البريد الإلكتروني</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-950/60 border border-slate-800/60 rounded-xl px-3 py-2 text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>
        </div>

        {/* OpenRouter AI Engine */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Bot className="w-4 h-4 text-purple-400" />
              إعدادات محرك الذكاء الاصطناعي (OpenRouter)
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
              NOVA_AI_BASE_URL: https://openrouter.ai/api/v1
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                مفتاح OpenRouter API الخاص بك (اختياري)
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder={
                    user?.settings?.openRouterApiKeyMasked
                      ? `المفتاح الحالي: ${user.settings.openRouterApiKeyMasked}`
                      : 'sk-or-v1-...'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                إذا تركته فارغاً، ستستخدم المنصة المفتاح التلقائي وسلسلة النماذج المجانية الذكية (Fallback).
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">النموذج المفضل</label>
              <select
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="openrouter/free">openrouter/free (توجيه مجاني ذكي)</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">
                  meta-llama/llama-3.3-70b-instruct:free
                </option>
                <option value="google/gemini-2.0-flash-exp:free">
                  google/gemini-2.0-flash-exp:free
                </option>
                <option value="qwen/qwen-2.5-72b-instruct:free">
                  qwen/qwen-2.5-72b-instruct:free
                </option>
                <option value="mistralai/mistral-7b-instruct:free">
                  mistralai/mistral-7b-instruct:free
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* Auto-Production Schedule Settings */}
        <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-slate-800 pb-3">
            <Clock className="w-4 h-4 text-cyan-400" />
            جدولة الإنتاج اليومي
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                الهدف اليومي (فيديوهات / يوم)
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">وقت النشر الأول</label>
              <input
                type="time"
                value={publishTime1}
                onChange={(e) => setPublishTime1(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">وقت النشر الثاني</label>
              <input
                type="time"
                value={publishTime2}
                onChange={(e) => setPublishTime2(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* 0$ Budget Policy Notice */}
        <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 text-xs text-cyan-300 flex items-start gap-3">
          <Shield className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>سياسة الميزانية 0$:</strong> المنصة مصممة بالكامل للاستخدام المجاني المفتوح. لا توجد أي اشتراكات مدفوعة أو تكاليف خفية، وتعتمد على النماذج المجانية والمفتوحة المصدر.
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </form>

      {/* Full Project Export Card for External Hosting */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Archive className="w-5 h-5 text-cyan-400" />
            تصدير المشروع بالكامل للاستضافة الخارجية (Export Project ZIP)
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono font-bold">
            جاهز للنقل 100%
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          تم تجهيز وحزم كافة ملفات الكود المصدري للمشروع (Frontend + Backend + قاعدة البيانات JSON + دوال معالجة الفيديو + ملفات تكامل Facebook Graph API و OpenRouter + Dockerfile + دليلي README و DEPLOYMENT_GUIDE) داخل ملف أرشيف ZIP نظيف ومستقل بدون أي مفاتيح سرية مكشوفة.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block">الهيكل المضمن</span>
            <span className="font-semibold text-slate-200">كامل الواجهة + الخادم</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block">دعم النشر</span>
            <span className="font-semibold text-slate-200">Docker + VPS + PM2</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 block">المفاتيح والأمان</span>
            <span className="font-semibold text-emerald-400">معزولة وآمنة (.env.example)</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a
            href="/api/download-project"
            download="novapulse-ai-studio.zip"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            <span>تحميل ملف المشروع الكامل (novapulse-ai-studio.zip)</span>
          </a>

          <a
            href="/novapulse-ai-studio.zip"
            download="novapulse-ai-studio.zip"
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition"
          >
            <Server className="w-4 h-4" />
            <span>رابط تحميل مباشر بديل</span>
          </a>
        </div>
      </div>
    </div>
  );
};
