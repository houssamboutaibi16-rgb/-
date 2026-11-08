import React, { useEffect, useState } from 'react';
import {
  Video,
  UploadCloud,
  Clock,
  Eye,
  Play,
  Share2,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Facebook,
  Bot,
  Zap,
} from 'lucide-react';
import { DashboardStats, VideoItem, ActivityLog } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardViewProps {
  onNavigate: (tab: string, meta?: any) => void;
  onOpenVideoInStudio: (video: VideoItem) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenVideoInStudio,
}) => {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<VideoItem[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);
  const [publishLoadingId, setPublishLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) {
      setStats({
        totalVideos: 0,
        publishedVideos: 0,
        scheduledVideos: 0,
        readyVideos: 0,
        processingVideos: 0,
        totalSeries: 0,
        queueCount: 0,
        metrics: { totalViews: 0, totalLikes: 0, totalShares: 0, totalComments: 0 },
        facebook: null,
        autoProduceEnabled: false,
        dailyTarget: 2,
      });
      setRecentVideos([]);
      setLogs([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [s, v, l] = await Promise.all([
        api.getDashboardStats(),
        api.getVideos(),
        api.getActivityLogs(15),
      ]);
      setStats(s);
      setRecentVideos(v.slice(0, 6));
      setLogs(l);
    } catch (err: any) {
      console.warn('Dashboard data notification:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleToggleAuto = async () => {
    if (!user) {
      alert('يرجى تسجيل الدخول أو إنشاء حساب لاستخدام وظائف الإنتاج');
      return;
    }
    try {
      await api.toggleAutoProduction();
      await refreshUser();
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleTriggerAutoBatch = async () => {
    if (!user) {
      alert('يرجى تسجيل الدخول أو إنشاء حساب لاستخدام وظائف الإنتاج');
      return;
    }
    try {
      setIsTriggeringBatch(true);
      const res = await api.triggerAutoBatch();
      alert(res.message);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  const handlePublishNow = async (video: VideoItem) => {
    if (!user?.facebook?.connected) {
      alert('يرجى ربط صفحة فيسبوك أولاً من قسم "ربط فيسبوك"');
      onNavigate('facebook');
      return;
    }

    try {
      setPublishLoadingId(video.id);
      const res = await api.publishVideo(video.id);
      alert(res.message);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPublishLoadingId(null);
    }
  };

  const fb = stats?.facebook || user?.facebook;
  const isFbConnected = fb?.status === 'connected';

  return (
    <div className="space-y-8 pb-16">
      {/* Welcome & Status Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 sm:p-8 border border-slate-800 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>استوديو الإنتاج التلقائي لريلز فيسبوك</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              مرحباً بك، {user?.name || 'صانع المحتوى'} 👋
            </h1>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed">
              منصة NovaPulse AI Studio تدير التخطيط الذكي، كتابة السيناريو، توليد مشاهد 9:16 العمودية، ونشرها على صفحة فيسبوك الخاصة بك.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleToggleAuto}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer ${
                stats?.autoProduceEnabled
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/25'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>
                {stats?.autoProduceEnabled ? 'إيقاف الإنتاج مؤقتاً' : 'تفعيل الإنتاج التلقائي'}
              </span>
            </button>

            <button
              onClick={handleTriggerAutoBatch}
              disabled={isTriggeringBatch}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-semibold transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{isTriggeringBatch ? 'جاري الإنتاج...' : 'إنتاج دفعة فيديوهات الآن'}</span>
            </button>
          </div>
        </div>

        {/* Status Mini Badges */}
        <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          {/* AI Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <Bot className="w-4 h-4 text-cyan-400" />
            <span>محرك الذكاء:</span>
            <span className="font-semibold text-cyan-400 font-mono">
              OpenRouter ({user?.settings?.customModel || 'openrouter/free'})
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>

          {/* Facebook Status */}
          <div
            onClick={() => onNavigate('facebook')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-pointer transition ${
              isFbConnected
                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300 hover:bg-emerald-900/30'
                : fb?.status === 'expired'
                ? 'bg-amber-950/30 border-amber-800/50 text-amber-300 hover:bg-amber-900/30'
                : 'bg-rose-950/30 border-rose-800/50 text-rose-300 hover:bg-rose-900/30'
            }`}
          >
            <Facebook className="w-4 h-4 text-[#1877f2]" />
            <span>صفحة فيسبوك:</span>
            <span className="font-semibold">
              {isFbConnected
                ? `${fb?.pageName || 'متصل'} (${fb?.followersCount || 0} متابع)`
                : fb?.status === 'expired'
                ? 'منتهي الصلاحية'
                : 'غير متصل (اضغط للربط)'}
            </span>
          </div>

          {/* Daily Goal */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300">
            <Clock className="w-4 h-4 text-purple-400" />
            <span>الهدف اليومي:</span>
            <span className="font-semibold text-purple-300 font-mono">
              {stats?.dailyTarget || 2} فيديوهات / يوم
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stat Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Produced */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">الفيديوهات المنتجة</span>
            <div className="text-3xl font-extrabold text-white font-mono">
              {stats?.totalVideos || 0}
            </div>
            <span className="text-[11px] text-cyan-400 font-medium">بجودة 1080p ومقاس 9:16</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Video className="w-6 h-6" />
          </div>
        </div>

        {/* Published to Facebook */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">المنشور على فيسبوك</span>
            <div className="text-3xl font-extrabold text-emerald-400 font-mono">
              {stats?.publishedVideos || 0}
            </div>
            <span className="text-[11px] text-emerald-400/80 font-medium">Reels نشطة على صفحتك</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
        </div>

        {/* In Queue / Scheduled */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">قيد الجدولة والمعالجة</span>
            <div className="text-3xl font-extrabold text-purple-400 font-mono">
              {stats?.queueCount || 0}
            </div>
            <span className="text-[11px] text-purple-400/80 font-medium">جاهزة للنشر التلقائي</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total Views & Reach */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-medium">إجمالي التفاعل والمشاهدات</span>
            <div className="text-3xl font-extrabold text-amber-400 font-mono">
              {(stats?.metrics?.totalViews || 0) + (stats?.metrics?.totalLikes || 0)}
            </div>
            <span className="text-[11px] text-amber-400/80 font-medium">تفاعل المشاهدين على Reels</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Recent Videos + Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent 9:16 Videos (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">أحدث الفيديوهات المنتجة (9:16)</h2>
              <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                {recentVideos.length}
              </span>
            </div>
            <button
              onClick={() => onNavigate('studio')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              عرض استوديو الإنتاج ←
            </button>
          </div>

          {recentVideos.length === 0 ? (
            <div className="p-10 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-200">لم يتم إنتاج أي فيديو بعد</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                ابدأ الآن بكتابة فكرة أو اطلب من Nova AI توليد فيديو 9:16 كامل بضغطة زر واحدة!
              </p>
              <button
                onClick={() => onNavigate('studio')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition"
              >
                <Sparkles className="w-4 h-4" />
                إنشاء أول فيديو الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recentVideos.map((vid) => {
                const isPublished = vid.status === 'published';
                return (
                  <div
                    key={vid.id}
                    className="group relative flex flex-col rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                  >
                    {/* Vertical 9:16 preview container */}
                    <div className="relative aspect-[9/16] bg-slate-950 flex flex-col justify-between p-3 overflow-hidden">
                      {/* Gradient backdrop simulation */}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/80 pointer-events-none"></div>

                      {/* Header tags */}
                      <div className="relative z-10 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isPublished
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : vid.status === 'scheduled'
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}
                        >
                          {isPublished
                            ? 'منشور على فيسبوك'
                            : vid.status === 'scheduled'
                            ? 'مجدول'
                            : 'مسودة جاهزة'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded">
                          {vid.duration || 60}ث
                        </span>
                      </div>

                      {/* Center Hook Text */}
                      <div className="relative z-10 text-center my-auto px-2">
                        <p className="text-xs font-bold text-white line-clamp-3 leading-relaxed drop-shadow">
                          "{vid.script?.hook || vid.title}"
                        </p>
                      </div>

                      {/* Footer Title */}
                      <div className="relative z-10 space-y-1">
                        {vid.seriesTitle && (
                          <span className="text-[10px] text-cyan-400 font-semibold block truncate">
                            {vid.seriesTitle} #{vid.episodeNumber || 1}
                          </span>
                        )}
                        <h4 className="text-xs font-bold text-slate-200 truncate">{vid.title}</h4>
                      </div>

                      {/* Hover Overlay with Open in Studio Button */}
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 z-20">
                        <button
                          onClick={() => onOpenVideoInStudio(vid)}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow"
                        >
                          <Play className="w-3.5 h-3.5" />
                          معاينة وتعديل
                        </button>
                        {!isPublished && (
                          <button
                            onClick={() => handlePublishNow(vid)}
                            disabled={publishLoadingId === vid.id}
                            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] text-white font-bold text-xs transition disabled:opacity-50"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {publishLoadingId === vid.id ? 'جاري النشر...' : 'نشر على فيسبوك'}
                          </button>
                        )}
                        {vid.facebookUrl && (
                          <a
                            href={vid.facebookUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
                          >
                            رابط المنشور على فيسبوك ↗
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Activity & Error Logs (1 col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">سجل الأنشطة والأخطاء</h2>
            <span className="text-xs text-slate-400">خاص بحسابك فقط</span>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 p-4 divide-y divide-slate-800/80 max-h-[500px] overflow-y-auto space-y-3">
            {logs.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">لا توجد أنشطة مسجلة بعد</p>
            ) : (
              logs.map((log) => {
                const isErr = log.status === 'error';
                const isSuccess = log.status === 'success';
                return (
                  <div key={log.id} className="pt-3 first:pt-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        {isErr ? (
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        )}
                        <span
                          className={
                            isErr
                              ? 'text-rose-400'
                              : isSuccess
                              ? 'text-emerald-300'
                              : 'text-slate-200'
                          }
                        >
                          {log.title}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{log.description}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
