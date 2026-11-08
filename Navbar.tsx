import React from 'react';
import { Sparkles, Sun, Moon, LogOut, User as UserIcon, Power, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';
import { api } from '../services/api.ts';

interface NavbarProps {
  onOpenAuth: () => void;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onNavigate }) => {
  const { user, logout, refreshUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleToggleAuto = async () => {
    if (!user) {
      onOpenAuth();
      return;
    }
    try {
      await api.toggleAutoProduction();
      await refreshUser();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fbStatus = user?.facebook?.status || 'disconnected';
  const isFbConnected = fbStatus === 'connected';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-tight text-white">NovaPulse</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                AI Studio
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">استوديو إنتاج ونشر الفيديوهات لـ Facebook</p>
          </div>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Facebook Connection Status Badge */}
          {user && (
            <button
              onClick={() => onNavigate('facebook')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                isFbConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : fbStatus === 'expired'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {isFbConnected ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>صفحة فيسبوك: {user.facebook.pageName || 'متصل'}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>
                    {fbStatus === 'expired'
                      ? 'فيسبوك: منتهي الصلاحية'
                      : fbStatus === 'needs_reconnect'
                      ? 'فيسبوك: يحتاج إعادة ربط'
                      : 'فيسبوك: غير متصل'}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Auto-Production Status Pill */}
          {user && (
            <button
              onClick={handleToggleAuto}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                user.settings.autoProduceEnabled
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
              title="تفعيل أو إيقاف الجدولة والإنتاج التلقائي"
            >
              <Power className={`w-3.5 h-3.5 ${user.settings.autoProduceEnabled ? 'text-cyan-400 animate-pulse' : ''}`} />
              <span className="hidden md:inline">الإنتاج التلقائي:</span>
              <span>{user.settings.autoProduceEnabled ? 'نشط' : 'متوقف'}</span>
            </button>
          )}

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            title="تبديل المظهر"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* User Profile or Login Button */}
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('settings')}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 transition"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-semibold max-w-[100px] truncate hidden md:inline">
                  {user.name}
                </span>
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 hover:bg-rose-950/40 hover:border-rose-900/60 text-slate-400 hover:text-rose-400 transition"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-md shadow-cyan-500/20 transition"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>تسجيل الدخول / حساب جديد</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
