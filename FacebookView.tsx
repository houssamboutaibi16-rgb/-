import React, { useState, useEffect } from 'react';
import {
  Facebook,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Unlink,
  ExternalLink,
  Layers,
  Key,
  Info,
  Send,
  HelpCircle,
} from 'lucide-react';
import { FacebookStatus, FacebookPageSummary } from '../types/index.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

export const FacebookView: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [fbStatus, setFbStatus] = useState<FacebookStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'token_oauth' | 'direct_token'>('token_oauth');

  // Input states
  const [userTokenInput, setUserTokenInput] = useState('');
  const [availablePages, setAvailablePages] = useState<FacebookPageSummary[]>([]);
  const [directPageId, setDirectPageId] = useState('');
  const [directPageToken, setDirectPageToken] = useState('');
  const [directPageName, setDirectPageName] = useState('');

  // Operation flags
  const [isFetchingPages, setIsFetchingPages] = useState(false);
  const [isSelectingPage, setIsSelectingPage] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const loadStatus = async () => {
    if (!user) {
      setFbStatus(null);
      setAvailablePages([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getFacebookStatus();
      setFbStatus(res);
      if (res.availablePages) {
        setAvailablePages(res.availablePages);
      }
    } catch (err: any) {
      console.warn('Facebook status notification:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [user]);

  // Method 1: Fetch pages from Meta Graph API using User Token
  const handleFetchPages = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userTokenInput.trim()) {
      alert('يرجى إدخال رمز وصول المستخدم (User Access Token)');
      return;
    }

    setIsFetchingPages(true);
    setStatusMessage(null);

    try {
      const pages = await api.fetchFacebookPages(userTokenInput.trim());
      setAvailablePages(pages);
      setStatusMessage({
        type: 'success',
        text: `تم العثور على ${pages.length} صفحة فيسبوك مرتبطة بحسابك! اختر الصفحة التي تريد ربطها أدناه.`,
      });
      await refreshUser();
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsFetchingPages(false);
    }
  };

  // Select page from list
  const handleSelectPage = async (pageId: string) => {
    setIsSelectingPage(true);
    setStatusMessage(null);

    try {
      const res = await api.selectFacebookPage(pageId);
      setStatusMessage({ type: 'success', text: res.message });
      await refreshUser();
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSelectingPage(false);
    }
  };

  // Method 2: Direct Page ID & Page Access Token
  const handleDirectConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPageId.trim() || !directPageToken.trim()) {
      alert('يرجى إدخال معرف الصفحة ورمز وصول الصفحة');
      return;
    }

    setIsSelectingPage(true);
    setStatusMessage(null);

    try {
      const res = await api.directConnectPage(
        directPageId.trim(),
        directPageToken.trim(),
        directPageName.trim() || undefined
      );
      setStatusMessage({ type: 'success', text: res.message });
      setDirectPageId('');
      setDirectPageToken('');
      setDirectPageName('');
      await refreshUser();
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsSelectingPage(false);
    }
  };

  // Live Token Verification Check
  const handleVerifyNow = async () => {
    setIsVerifying(true);
    setStatusMessage(null);

    try {
      const res = await api.verifyFacebookConnection();
      if (res.valid) {
        setStatusMessage({
          type: 'success',
          text: 'اتصال صفحة فيسبوك صالح ونشط ومؤكد بنجاح مع Meta Graph API! ✅',
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `فشل التحقق: ${res.errorMessage || 'الرمز غير صالح أو منتهي الصلاحية'}`,
        });
      }
      await refreshUser();
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  // Disconnect Page
  const handleDisconnect = async () => {
    if (!confirm('هل أنت متأكد من فصل صفحة فيسبوك المرتبطة بحسابك؟')) return;
    setIsDisconnecting(true);
    setStatusMessage(null);

    try {
      const res = await api.disconnectFacebook();
      setStatusMessage({ type: 'info', text: res.message });
      setAvailablePages([]);
      await refreshUser();
      await loadStatus();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isConnected = fbStatus?.status === 'connected';
  const isExpired = fbStatus?.status === 'expired';
  const needsReconnect = fbStatus?.status === 'needs_reconnect';

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Facebook className="w-6 h-6 text-[#1877f2]" />
            <h1 className="text-xl sm:text-2xl font-black text-white">ربط صفحات فيسبوك (Facebook Reels)</h1>
          </div>
          <p className="text-xs text-slate-400">
            تكامل رسمي ومستقل لكل مستخدم عبر Meta Graph API مع عزل كامل للرموز والصفحات.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border ${
              isConnected
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : isExpired
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : needsReconnect
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                متصل وجاهز للنشر
              </>
            ) : isExpired ? (
              <>
                <AlertCircle className="w-4 h-4 text-amber-400" />
                الاتصال منتهي الصلاحية
              </>
            ) : needsReconnect ? (
              <>
                <AlertCircle className="w-4 h-4 text-rose-400" />
                يحتاج إلى إعادة الاتصال
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                غير متصل
              </>
            )}
          </span>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
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

      {/* Active Connected Page Card (if connected or has page details) */}
      {fbStatus?.pageId && (
        <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#1877f2]/10 border border-slate-800 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#1877f2] flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                <Facebook className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{fbStatus.pageName}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                    الصفحة النشطة
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono">
                  معرف الصفحة (Page ID): {fbStatus.pageId}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleVerifyNow}
                disabled={isVerifying}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>{isVerifying ? 'جاري الفحص...' : 'فحص صلاحية الاتصال'}</span>
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-semibold transition disabled:opacity-50 cursor-pointer"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>فصل الصفحة</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 block">تصنيف الصفحة</span>
              <span className="font-semibold text-slate-300">{fbStatus.category || 'عام'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 block">عدد المتابعين</span>
              <span className="font-semibold text-slate-300 font-mono">
                {fbStatus.followersCount || 0} متابع
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-500 block">آخر فحص اتصال</span>
              <span className="font-semibold text-slate-300 font-mono text-[11px]">
                {fbStatus.lastChecked
                  ? new Date(fbStatus.lastChecked).toLocaleString('ar-EG', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })
                  : 'الآن'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Connect / Change Page Tabs */}
      <div className="p-6 rounded-3xl bg-slate-900/70 border border-slate-800 shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">
              {fbStatus?.pageId ? 'تغيير الصفحة أو إعادة الاتصال' : 'ربط صفحة فيسبوك جديدة'}
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('token_oauth')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'token_oauth'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              جلب الصفحات برمز المستخدم
            </button>
            <button
              onClick={() => setActiveTab('direct_token')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                activeTab === 'direct_token'
                  ? 'bg-cyan-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الربط المباشر برمز الصفحة
            </button>
          </div>
        </div>

        {/* Tab 1: User Access Token -> Multi-Page Selector */}
        {activeTab === 'token_oauth' && (
          <div className="space-y-6">
            <form onSubmit={handleFetchPages} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  رمز وصول المستخدم (Facebook User Access Token)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={userTokenInput}
                    onChange={(e) => setUserTokenInput(e.target.value)}
                    placeholder="EAAB... (رمز المستخدم الحاصل على إذن pages_show_list)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                  يتم استدعاء Meta Graph API لجلب جميع الصفحات التي تديرها بحسابك لتختار الصفحة المناسبة للنشر.
                </p>
              </div>

              <button
                type="submit"
                disabled={isFetchingPages || !userTokenInput.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingPages ? 'animate-spin' : ''}`} />
                <span>{isFetchingPages ? 'جاري جلب الصفحات من فيسبوك...' : 'جلب صفحات الحساب الآن'}</span>
              </button>
            </form>

            {/* List of Available Pages */}
            {availablePages.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-200">
                  الصفحات المتاحة لحسابك ({availablePages.length} صفحات):
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {availablePages.map((page) => {
                    const isSelected = fbStatus?.pageId === page.id;
                    return (
                      <div
                        key={page.id}
                        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 transition ${
                          isSelected
                            ? 'bg-blue-950/30 border-blue-500/60'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="space-y-1">
                          <h5 className="text-xs font-bold text-white">{page.name}</h5>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {page.id}</p>
                          {page.category && (
                            <span className="text-[10px] text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded">
                              {page.category}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleSelectPage(page.id)}
                          disabled={isSelectingPage || isSelected}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                          }`}
                        >
                          {isSelected ? 'مربوطة حالياً' : 'ربط هذه الصفحة'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Direct Page ID & Page Access Token */}
        {activeTab === 'direct_token' && (
          <form onSubmit={handleDirectConnect} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  معرف صفحة فيسبوك (Page ID) *
                </label>
                <input
                  type="text"
                  required
                  value={directPageId}
                  onChange={(e) => setDirectPageId(e.target.value)}
                  placeholder="مثال: 10482910482910"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  اسم الصفحة (اختياري)
                </label>
                <input
                  type="text"
                  value={directPageName}
                  onChange={(e) => setDirectPageName(e.target.value)}
                  placeholder="اسم صفحتك على فيسبوك"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-semibold text-slate-300 mb-1.5">
                رمز وصول الصفحة (Page Access Token) *
              </label>
              <input
                type="password"
                required
                value={directPageToken}
                onChange={(e) => setDirectPageToken(e.target.value)}
                placeholder="EAA..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                يتم حفظ الرمز مشفراً في الخادم واستخدامه لنشر فيديوهات هذا الحساب فقط.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSelectingPage || !directPageId.trim() || !directPageToken.trim()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSelectingPage ? 'جاري التحقق والربط...' : 'التحقق وربط الصفحة مباشرة'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Meta Guidelines & Permissions Guide */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-slate-800 space-y-4 text-xs text-slate-300">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          متطلبات وصلاحيات Meta Graph API الرسمية
        </div>

        <p className="leading-relaxed text-slate-400">
          لتشغيل النشر الآلي لريلز فيسبوك بدون أخطاء، تأكد من استيفاء الصلاحيات التالية في تطبيق فيسبوك (Meta App):
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="font-bold text-cyan-400 block">pages_show_list</span>
            <span className="text-slate-400 font-sans text-xs">
              لجلب قائمة الصفحات التابعة لحساب المستخدم لاختيار الصفحة المراد ربطها.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="font-bold text-cyan-400 block">publish_video</span>
            <span className="text-slate-400 font-sans text-xs">
              لرفع ونشر مقاطع الفيديو والريلز (9:16) مباشرة على الصفحة.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="font-bold text-cyan-400 block">pages_manage_posts</span>
            <span className="text-slate-400 font-sans text-xs">
              لإدارة المنشورات، الجدولة الزمنية، وضبط عناوين وأوصاف المقاطع.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1">
            <span className="font-bold text-cyan-400 block">pages_read_engagement</span>
            <span className="text-slate-400 font-sans text-xs">
              لقراءة التفاعلات، الإعجابات، والمشاهدات وعرضها في لوحة التحكم.
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-800/40 text-[11px] text-blue-300 space-y-1">
          <span className="font-bold flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-400" />
            أمان كامل وعزل تام لبيانات المستخدمين
          </span>
          <p className="leading-relaxed">
            المنصة لا تستخدم أي رمز مشترك لصاحب المنصة. كل مستخدم يربط صفحته الخاصة، ورموز الوصول تُحفظ في قاعدة بيانات الخادم بشكل آمن، ولا يمكن لأي مستخدم آخر رؤية أو استخدام صفحتك أبداً.
          </p>
        </div>
      </div>
    </div>
  );
};
