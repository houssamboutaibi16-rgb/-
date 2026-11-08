import React from 'react';
import {
  LayoutDashboard,
  Bot,
  Video,
  Layers,
  CalendarClock,
  Facebook,
  Settings,
  PlusCircle,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onQuickNewVideo: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onSelectTab, onQuickNewVideo }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'chat', label: 'مساعد Nova AI', icon: Bot, badge: 'متحدث' },
    { id: 'studio', label: 'استوديو الفيديوهات', icon: Video, badge: '9:16' },
    { id: 'series', label: 'إدارة السلاسل', icon: Layers },
    { id: 'queue', label: 'جدول النشر والانتظار', icon: CalendarClock },
    { id: 'facebook', label: 'ربط فيسبوك', icon: Facebook, color: 'text-blue-400' },
    { id: 'settings', label: 'الإعدادات والمفاتيح', icon: Settings },
  ];

  return (
    <>
      {/* Desktop Sidebar (Right side in RTL) */}
      <aside className="hidden lg:flex flex-col w-64 border-l border-slate-800 bg-slate-950/60 p-4 shrink-0 min-h-[calc(100vh-4rem)]">
        {/* Quick Action Button */}
        <button
          onClick={onQuickNewVideo}
          className="w-full mb-6 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>إنتاج فيديو 9:16 جديد</span>
        </button>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-l from-cyan-500/20 to-transparent border-r-4 border-cyan-400 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : item.color || 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Platform Info Footnote */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 text-[11px] text-slate-400 mt-auto">
          <div className="flex items-center gap-1.5 font-bold text-slate-300 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            نظام متعدد المستخدمين
          </div>
          <p className="leading-relaxed">
            بياناتك، وسلاسل فيديوهاتك، وربط صفحة فيسبوك خاصة بك بالكامل ومعزولة بأمان.
          </p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
        {menuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
                isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="truncate max-w-[55px]">{item.label}</span>
            </button>
          );
        })}
        {/* Additional mobile tab for facebook / settings */}
        <button
          onClick={() => onSelectTab('facebook')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-[10px] font-medium transition ${
            activeTab === 'facebook' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Facebook className="w-5 h-5 mb-0.5 text-blue-400" />
          <span>فيسبوك</span>
        </button>
      </nav>
    </>
  );
};
