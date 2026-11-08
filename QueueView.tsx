import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Play,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Video,
  Send,
  Zap,
} from 'lucide-react';
import { QueueItem } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const QueueView: React.FC = () => {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadQueue = async () => {
    if (!user) {
      setQueue([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getQueue();
      setQueue(res);
    } catch (err: any) {
      console.warn('Queue load notification:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [user]);

  const handleDelete = async (id: string) => {
    if (!confirm('هل تريد إزالة هذا الفيديو من جدول النشر؟')) return;
    try {
      await api.removeFromQueue(id);
      await loadQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      await api.retryQueueItem(id);
      await loadQueue();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleProcessDue = async () => {
    try {
      setIsProcessing(true);
      const res = await api.processDueQueue();
      alert(res.message);
      await loadQueue();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const publishTimes = user?.settings?.publishTimes || ['14:00', '20:00'];

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-white">جدول النشر وقائمة الانتظار</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {queue.length} مهام
            </span>
          </div>
          <p className="text-xs text-slate-400">
            مواعيد نشر Facebook Reels التلقائية على صفحتك وفق الهدف اليومي المحدد.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>{isProcessing ? 'جاري التحقق والنشر...' : 'نشر الفيديوهات المستحقة الآن'}</span>
          </button>
        </div>
      </div>

      {/* Daily Slot Indicators */}
      <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white">أوقات النشر اليومية المبرمجة:</span>
        </div>
        <div className="flex items-center gap-2">
          {publishTimes.map((t, idx) => (
            <span
              key={idx}
              className="text-xs font-mono font-bold px-3 py-1 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300"
            >
              {t} بتوقيتك المحلي
            </span>
          ))}
          <span className="text-xs text-slate-400">({user?.settings?.dailyTarget || 2} فيديوهات يومياً)</span>
        </div>
      </div>

      {/* Queue List */}
      {queue.length === 0 ? (
        <div className="p-12 rounded-3xl border border-dashed border-slate-800 bg-slate-900/40 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <CalendarClock className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-200">قائمة النشر فارغة حالياً</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            يمكنك جدولة أي فيديو تم إنتاجه من استوديو الفيديوهات أو تفعيل نظام الإنتاج التلقائي لملء الجدول تلقائياً.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => {
            const isCompleted = item.status === 'completed';
            const isFailed = item.status === 'failed';
            const isProcessingItem = item.status === 'processing';

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-800/90 shadow-sm hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isCompleted
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isFailed
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : isFailed ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">{item.videoTitle}</h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1 font-mono">
                        <CalendarClock className="w-3.5 h-3.5 text-cyan-400" />
                        موعد النشر:{' '}
                        {new Date(item.scheduledTime).toLocaleString('ar-EG', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                      {item.attempts > 0 && (
                        <span className="text-slate-500 font-mono">
                          (محاولات: {item.attempts})
                        </span>
                      )}
                    </div>
                    {item.errorMessage && (
                      <p className="text-[11px] text-rose-400 font-medium">
                        سبب الفشل: {item.errorMessage}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isCompleted
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : isFailed
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        : isProcessingItem
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                    }`}
                  >
                    {isCompleted
                      ? 'تم النشر بنجاح'
                      : isFailed
                      ? 'فشل النشر'
                      : isProcessingItem
                      ? 'جاري المعالجة...'
                      : 'قيد الانتظار'}
                  </span>

                  {isFailed && (
                    <button
                      onClick={() => handleRetry(item.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="إعادة المحاولة"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition"
                    title="حذف من الجدول"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
