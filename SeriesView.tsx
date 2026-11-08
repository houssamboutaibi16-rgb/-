import React, { useState, useEffect } from 'react';
import {
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { SeriesItem, VideoItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface SeriesViewProps {
  onOpenVideoInStudio: (video: VideoItem) => void;
}

export const SeriesView: React.FC<SeriesViewProps> = ({ onOpenVideoInStudio }) => {
  const { user } = useAuth();
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [language, setLanguage] = useState<'ar' | 'darija' | 'en'>('ar');
  const [style, setStyle] = useState<any>('educational');
  const [targetDuration, setTargetDuration] = useState(65);

  const loadSeries = async () => {
    if (!user) {
      setSeriesList([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getSeries();
      setSeriesList(res);
    } catch (err: any) {
      console.warn('Series load notification:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSeries();
  }, [user]);

  const handleCreateSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !topic.trim()) {
      alert('يرجى ملء اسم السلسلة والموضوع الرئيسي');
      return;
    }

    try {
      await api.createSeries({
        title,
        description,
        topic,
        language,
        style,
        targetDuration,
      });

      setShowCreateModal(false);
      setTitle('');
      setDescription('');
      setTopic('');
      await loadSeries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه السلسلة؟')) return;
    try {
      await api.deleteSeries(id);
      await loadSeries();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleGenerateNextEpisode = async (seriesId: string) => {
    try {
      setGeneratingId(seriesId);
      const res = await api.generateNextEpisode(seriesId);
      alert(res.message);
      await loadSeries();
      if (res.video) {
        onOpenVideoInStudio(res.video);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const styleLabels: Record<string, string> = {
    educational: 'تعليمي ومعرفي',
    dramatic: 'درامي ومشوق',
    storytelling: 'قصصي وسردي',
    motivational: 'تحفيزي وإلهامي',
    tech: 'تكنولوجي وتقني',
    curiosity: 'فضولي وغرائب',
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">إدارة سلاسل المحتوى</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              استمرارية الحلقات
            </span>
          </div>
          <p className="text-xs text-slate-400">
            أنشئ سلاسل ريلز منتظمة ليحافظ الذكاء الاصطناعي على تسلسل الحلقات والشغف لدى المتابعين.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إنشاء سلسلة جديدة</span>
        </button>
      </div>

      {/* Series Grid */}
      {seriesList.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Layers className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">لا توجد أي سلسلة حتى الآن</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              تساعدك السلاسل في تجميع الفيديوهات المترابطة (مثل: سلسلة أسرار الذكاء الاصطناعي، سلسلة كيف تبدأ مشروعك)، ليقوم Nova AI بإنتاج الحلقات بالتسلسل المناسب تلقائياً.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            إنشاء أول سلسلة
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {seriesList.map((series) => (
            <div
              key={series.id}
              className="group relative flex flex-col justify-between rounded-3xl bg-slate-900/80 border border-slate-800 p-6 space-y-5 hover:border-cyan-500/50 transition-all hover:shadow-xl hover:shadow-cyan-500/5"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    الحلقة الحالية: {series.currentEpisode}
                  </span>
                  <button
                    onClick={() => handleDelete(series.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded-lg transition"
                    title="حذف السلسلة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition">
                  {series.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {series.description || series.topic}
                </p>
              </div>

              {/* Meta tags */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">أسلوب المحتوى</span>
                  <span className="font-semibold text-slate-300 truncate block">
                    {styleLabels[series.style] || series.style}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-500 block">مدة الحلقة</span>
                  <span className="font-semibold text-slate-300 block font-mono">
                    {series.targetDuration} ثانية
                  </span>
                </div>
              </div>

              {/* Action: Generate Next Episode */}
              <button
                onClick={() => handleGenerateNextEpisode(series.id)}
                disabled={generatingId === series.id}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  {generatingId === series.id
                    ? 'جاري تأليف وإنتاج الحلقة التالية...'
                    : `توليد الحلقة ${series.currentEpisode + 1} بواسطة الذكاء الاصطناعي`}
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Series Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-bold text-white">إنشاء سلسلة ريلز جديدة</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSeries} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">اسم السلسلة *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثال: أسرار الإنتاجية بالذكاء الاصطناعي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">الموضوع الرئيسي *</label>
                <textarea
                  required
                  rows={2}
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="وصف المحور العام الذي تدور حوله حلقات السلسلة ليتتبعه الذكاء الاصطناعي..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">اللغة</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="ar">العربية الفصحى</option>
                    <option value="darija">الدارجة المغربية</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">أسلوب المحتوى</label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="educational">تعليمي ومعرفي</option>
                    <option value="dramatic">درامي ومشوق</option>
                    <option value="storytelling">قصصي وسردي</option>
                    <option value="motivational">تحفيزي وإلهامي</option>
                    <option value="tech">تقني وتكنولوجي</option>
                    <option value="curiosity">غرائب وفضول</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">مدة الحلقة</label>
                  <select
                    value={targetDuration}
                    onChange={(e) => setTargetDuration(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200"
                  >
                    <option value="60">60 ثانية</option>
                    <option value="75">75 ثانية</option>
                    <option value="90">90 ثانية</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-500/25"
                >
                  إنشاء وحفظ السلسلة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
