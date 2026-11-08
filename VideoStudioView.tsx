import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Play,
  Share2,
  Calendar,
  Layers,
  Wand2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Clock,
  Type,
  Palette,
  Mic,
} from 'lucide-react';
import { VideoItem, Scene, SeriesItem, VisualStyleType } from '../types/index.ts';
import { VideoPlayer916 } from '../components/VideoPlayer916.tsx';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface VideoStudioViewProps {
  initialVideo?: VideoItem | null;
  initialTopic?: string;
  onNavigate: (tab: string) => void;
}

export const VideoStudioView: React.FC<VideoStudioViewProps> = ({
  initialVideo,
  initialTopic = '',
  onNavigate,
}) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState(initialTopic);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>('');
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([]);
  const [language, setLanguage] = useState<'ar' | 'darija' | 'en'>('ar');
  const [style, setStyle] = useState('educational');
  const [duration, setDuration] = useState<number>(65);

  // Script state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState<string[]>(['#NovaPulse', '#Reels', '#فيسبوك']);
  const [hook, setHook] = useState('');
  const [body, setBody] = useState('');
  const [cta, setCta] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);

  // Video item reference
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load series for series dropdown
  useEffect(() => {
    if (user) {
      api.getSeries().then(setSeriesList).catch(() => {});
    } else {
      setSeriesList([]);
    }
  }, [user]);

  // Populate from initialVideo if provided
  useEffect(() => {
    if (initialVideo) {
      setCurrentVideoId(initialVideo.id);
      setTitle(initialVideo.title);
      setDescription(initialVideo.description);
      setHashtags(initialVideo.hashtags || []);
      setDuration(initialVideo.duration || 65);
      setSelectedSeriesId(initialVideo.seriesId || '');

      if (initialVideo.script) {
        setHook(initialVideo.script.hook || '');
        setBody(initialVideo.script.body || '');
        setCta(initialVideo.script.cta || '');
        setScenes(initialVideo.script.scenes || []);
      }
    } else if (initialTopic) {
      setTopic(initialTopic);
    }
  }, [initialVideo, initialTopic]);

  // Generate complete script with AI
  const handleAIGenerate = async () => {
    if (!topic.trim()) {
      alert('الرجاء كتابة موضوع الفيديو أولاً');
      return;
    }

    setIsGeneratingScript(true);
    setStatusMessage(null);

    try {
      const res = await api.generateScript({
        topic: topic.trim(),
        seriesId: selectedSeriesId || undefined,
        style,
        language,
        duration,
      });

      const s = res.script;
      setTitle(s.title || topic);
      setDescription(s.description || '');
      setHashtags(s.hashtags || ['#NovaPulse', '#Reels', '#فيسبوك']);
      setHook(s.hook || '');
      setBody(s.body || '');
      setCta(s.cta || '');
      setScenes(s.scenes || []);

      setStatusMessage({
        type: 'success',
        text: `تم توليد سيناريو 9:16 بنجاح بواسطة ${res.modelUsed} (${s.scenes?.length || 0} مشاهد)`,
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Save Video to Database
  const handleSaveVideo = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const videoPayload: Partial<VideoItem> = {
        title: title || topic || 'فيديو ريلز جديد',
        description,
        hashtags,
        duration,
        seriesId: selectedSeriesId || undefined,
        seriesTitle: seriesList.find((s) => s.id === selectedSeriesId)?.title,
        status: 'ready',
        script: {
          hook,
          body,
          cta,
          scenes,
        },
      };

      if (currentVideoId) {
        await api.updateVideo(currentVideoId, videoPayload);
        setStatusMessage({ type: 'success', text: 'تم تحديث الفيديو بنجاح!' });
      } else {
        const created = await api.createVideo(videoPayload);
        setCurrentVideoId(created.id);
        setStatusMessage({ type: 'success', text: 'تم حفظ الفيديو في الاستوديو بنجاح!' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Publish directly to Facebook Page
  const handlePublishFacebook = async () => {
    if (!user?.facebook?.connected) {
      alert('صفحة فيسبوك غير متصلة! يرجى ربط صفحة أولاً من قسم "ربط فيسبوك".');
      onNavigate('facebook');
      return;
    }

    // Save first if not saved
    let videoIdToPublish = currentVideoId;
    if (!videoIdToPublish) {
      const created = await api.createVideo({
        title: title || topic || 'فيديو فيسبوك ريلز',
        description,
        hashtags,
        duration,
        seriesId: selectedSeriesId || undefined,
        status: 'ready',
        script: { hook, body, cta, scenes },
      });
      videoIdToPublish = created.id;
      setCurrentVideoId(created.id);
    }

    setIsPublishing(true);
    setStatusMessage(null);

    try {
      const res = await api.publishVideo(videoIdToPublish);
      setStatusMessage({
        type: 'success',
        text: `تم النشر بنجاح على صفحة فيسبوك! 🎉`,
      });
      alert(res.message);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
      alert(err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  // Schedule Video
  const handleScheduleVideo = async () => {
    const scheduledTime = prompt('أدخل موعد النشر بتنسيق ISO (مثلاً: 2026-11-08T20:00:00Z):', new Date(Date.now() + 3600000).toISOString());
    if (!scheduledTime) return;

    let vId = currentVideoId;
    if (!vId) {
      const created = await api.createVideo({
        title: title || topic || 'فيديو مجدول',
        description,
        hashtags,
        duration,
        seriesId: selectedSeriesId || undefined,
        script: { hook, body, cta, scenes },
      });
      vId = created.id;
      setCurrentVideoId(created.id);
    }

    try {
      await api.scheduleVideo(vId, scheduledTime);
      alert('تمت إضافة الفيديو إلى جدول النشر بنجاح!');
      onNavigate('queue');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const updateScene = (index: number, updates: Partial<Scene>) => {
    setScenes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const addScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      order: scenes.length + 1,
      narration: 'نص المشهد الجديد...',
      duration: 15,
      visualPrompt: 'انتقال تكنولوجي',
      visualType: 'neon_geometry',
      subtitle: 'ترجمة المشهد الجديد',
    };
    setScenes((prev) => [...prev, newScene]);
  };

  const removeScene = (index: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
  };

  const visualStyleOptions: { id: VisualStyleType; label: string }[] = [
    { id: 'neon_geometry', label: 'نيون وهندسة 3D' },
    { id: 'tech_grid', label: 'شبكة ذكاء اصطناعي' },
    { id: 'abstract_wave', label: 'أمواج لونية متدفقة' },
    { id: 'particles', label: 'جزيئات مجرة ذهبية' },
    { id: 'gradient_pulse', label: 'طاقة نابضة عميقة' },
    { id: 'cinematic_flame', label: 'شظايا سينمائية دافئة' },
  ];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">استوديو إنتاج الفيديوهات (9:16)</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Facebook Reels
            </span>
          </div>
          <p className="text-xs text-slate-400">
            خطط، اكتب السيناريو، عاين الفيديو بدقة 1080p، وانشره مباشرة على صفحة فيسبوك.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSaveVideo}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ في الاستوديو'}</span>
          </button>

          <button
            onClick={handleScheduleVideo}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-bold transition cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>جدولة النشر</span>
          </button>

          <button
            onClick={handlePublishFacebook}
            disabled={isPublishing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition disabled:opacity-50 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{isPublishing ? 'جاري النشر على فيسبوك...' : 'نشر على فيسبوك الآن'}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/40 border-rose-800 text-rose-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Studio Grid: Controls & Scripts (Left/Right) + 9:16 Video Player */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left/Middle: Stage Controls & Script Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Topic & AI Generation Inputs */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-cyan-400" />
                الموضوع ومحددات الإنتاج
              </h2>
              <span className="text-xs text-slate-500 font-mono">الخطوة 1 من 4</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                موضوع الفيديو أو الفكرة الأساسية
              </label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={2}
                placeholder="مثال: 3 عادات يومية تضاعف إنتاجيتك في العمل، أو خطأ يرتكبه الجميع في التسويق..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Series selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  ربط بسلسلة (اختياري)
                </label>
                <select
                  value={selectedSeriesId}
                  onChange={(e) => setSelectedSeriesId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">بدون سلسلة (فيديو مستقل)</option>
                  {seriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} (الحلقة {s.currentEpisode + 1})
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  اللغة / اللهجة
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="ar">العربية الفصحى</option>
                  <option value="darija">الدارجة المغربية</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Target Duration */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  المدة المستهدفة
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="60">60 ثانية (سريع)</option>
                  <option value="75">75 ثانية (متوازن)</option>
                  <option value="90">90 ثانية (شامل وموسع)</option>
                </select>
              </div>
            </div>

            {/* AI Generate Button */}
            <button
              onClick={handleAIGenerate}
              disabled={isGeneratingScript || !topic.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingScript
                  ? 'جاري تأليف السيناريو وتقسيم المشاهد...'
                  : 'توليد السيناريو والمشاهد بواسطة Nova AI'}
              </span>
            </button>
          </div>

          {/* Section 2: Meta Titles & Hooks */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-purple-400" />
              العنوان والخطاف الافتتاحي (Facebook Reel Hook)
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  عنوان الفيديو
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان ريلز خاطف ومثير..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  الخطاف الافتتاحي (أول 3 ثوانٍ)
                </label>
                <input
                  type="text"
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                  placeholder="العبارة التي ستوقف المشاهد عن التمرير..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  الوصف والهاشتاغات
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="وصف شيق يدعو للمشاركة والتعليق..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Scenes Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Palette className="w-4 h-4 text-emerald-400" />
                  مشاهد الفيديو المقسمة ({scenes.length} مشاهد)
                </h2>
                <span className="text-xs text-slate-400 font-mono">
                  الإجمالي:{' '}
                  {scenes.reduce((acc, s) => acc + (s.duration || 0), 0)} ثانية
                </span>
              </div>
              <button
                onClick={addScene}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 font-bold bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة مشهد
              </button>
            </div>

            {scenes.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                لا توجد مشاهد مضافة بعد. اضغط "توليد السيناريو بواسطة Nova AI" أو أضف مشهداً يدوياً.
              </p>
            ) : (
              <div className="space-y-3">
                {scenes.map((scene, idx) => (
                  <div
                    key={scene.id || idx}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-cyan-400 font-mono">
                        المشهد {idx + 1}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          <input
                            type="number"
                            min="5"
                            max="30"
                            value={scene.duration}
                            onChange={(e) =>
                              updateScene(idx, { duration: Number(e.target.value) })
                            }
                            className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-white"
                          />
                          <span>ث</span>
                        </div>
                        <button
                          onClick={() => removeScene(idx)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="حذف المشهد"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Narration */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                        <Mic className="w-3 h-3 text-cyan-400" />
                        نص الإلقاء الصوتي:
                      </label>
                      <textarea
                        value={scene.narration}
                        onChange={(e) => updateScene(idx, { narration: e.target.value })}
                        rows={2}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    {/* Subtitle & Visual Style row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          الترجمة المعروضة (Subtitles):
                        </label>
                        <input
                          type="text"
                          value={scene.subtitle}
                          onChange={(e) => updateScene(idx, { subtitle: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          المؤثر البصري والخلفية:
                        </label>
                        <select
                          value={scene.visualType}
                          onChange={(e) =>
                            updateScene(idx, { visualType: e.target.value as any })
                          }
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
                        >
                          {visualStyleOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Real-time 9:16 Video Player & Facebook Reel Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="sticky top-20">
            <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-cyan-400" />
                  معاينة مباشرة بدقة 9:16
                </h3>
                <span className="text-[11px] text-slate-400 font-mono">1080 × 1920</span>
              </div>

              {/* Real-time 9:16 Vertical Player */}
              <VideoPlayer916
                scenes={
                  scenes.length > 0
                    ? scenes
                    : [
                        {
                          id: 'demo',
                          order: 1,
                          narration: hook || topic || 'معاينة فيديو NovaPulse AI Studio',
                          duration: 15,
                          visualPrompt: 'انتقال نيون',
                          visualType: 'neon_geometry',
                          subtitle: hook || 'NovaPulse AI Studio',
                        },
                      ]
                }
                duration={duration}
                seriesTitle={seriesList.find((s) => s.id === selectedSeriesId)?.title}
                onPublishFacebook={handlePublishFacebook}
                isPublishing={isPublishing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
