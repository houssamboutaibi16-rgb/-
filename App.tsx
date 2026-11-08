import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { AuthModal } from './components/AuthModal.tsx';

import { DashboardView } from './views/DashboardView.tsx';
import { NovaAIChatView } from './views/NovaAIChatView.tsx';
import { VideoStudioView } from './views/VideoStudioView.tsx';
import { SeriesView } from './views/SeriesView.tsx';
import { QueueView } from './views/QueueView.tsx';
import { FacebookView } from './views/FacebookView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { VideoItem } from './types/index.ts';
import { Sparkles, Video, Bot, Facebook, ShieldCheck, ArrowLeft } from 'lucide-react';

function MainAppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Cross-tab transfer states
  const [studioInitialVideo, setStudioInitialVideo] = useState<VideoItem | null>(null);
  const [studioInitialTopic, setStudioInitialTopic] = useState<string>('');

  const handleNavigate = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickNewVideo = () => {
    setStudioInitialVideo(null);
    setStudioInitialTopic('');
    setActiveTab('studio');
  };

  const handleOpenVideoInStudio = (video: VideoItem) => {
    setStudioInitialVideo(video);
    setActiveTab('studio');
  };

  const handleOpenStudioWithTopic = (topic: string) => {
    setStudioInitialVideo(null);
    setStudioInitialTopic(topic);
    setActiveTab('studio');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-xl shadow-cyan-500/25 animate-bounce">
          <Sparkles className="w-6 h-6" />
        </div>
        <p className="text-sm font-semibold text-slate-300">جاري تشغيل استوديو NovaPulse AI...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <Navbar onOpenAuth={() => setIsAuthModalOpen(true)} onNavigate={handleNavigate} />

      {/* Main Container */}
      <div className="flex flex-1 max-w-[1700px] w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={handleNavigate}
          onQuickNewVideo={handleQuickNewVideo}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {/* Guest Welcome Banner if not logged in */}
          {!user && (
            <div className="mb-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/30 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold border border-cyan-500/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  منصة متعددة المستخدمين ومجانية 100%
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  أهلاً بك في NovaPulse AI Studio!
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                  أنشئ حسابك الخاص الآن لربط صفحة Facebook الخاصة بك، واستعمال مساعد Nova AI لإنتاج ونشر الفيديوهات القصيرة (9:16) تلقائياً.
                </p>
              </div>

              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 transition transform hover:-translate-y-0.5 cursor-pointer shrink-0"
              >
                تسجيل الدخول / إنشاء حسابك مجاناً
              </button>
            </div>
          )}

          {/* Active Tab Router */}
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              onOpenVideoInStudio={handleOpenVideoInStudio}
            />
          )}

          {activeTab === 'chat' && (
            <NovaAIChatView onOpenStudioWithTopic={handleOpenStudioWithTopic} />
          )}

          {activeTab === 'studio' && (
            <VideoStudioView
              initialVideo={studioInitialVideo}
              initialTopic={studioInitialTopic}
              onNavigate={handleNavigate}
            />
          )}

          {activeTab === 'series' && (
            <SeriesView onOpenVideoInStudio={handleOpenVideoInStudio} />
          )}

          {activeTab === 'queue' && <QueueView />}

          {activeTab === 'facebook' && <FacebookView />}

          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
