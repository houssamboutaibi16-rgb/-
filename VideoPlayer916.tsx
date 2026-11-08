import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Download, Share2, Sparkles, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { Scene } from '../types/index.ts';
import { VideoRenderer } from '../services/videoRenderer.ts';

interface VideoPlayerProps {
  scenes: Scene[];
  duration?: number;
  seriesTitle?: string;
  episodeNumber?: number;
  onPublishFacebook?: () => void;
  isPublishing?: boolean;
}

export const VideoPlayer916: React.FC<VideoPlayerProps> = ({
  scenes,
  duration = 60,
  seriesTitle,
  episodeNumber,
  onPublishFacebook,
  isPublishing = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VideoRenderer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderedBlobUrl, setRenderedBlobUrl] = useState<string | null>(null);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Compute total duration from scenes or fallback
  const totalDuration = scenes.length > 0
    ? scenes.reduce((acc, s) => acc + (s.duration || 10), 0)
    : duration;

  // Initialize renderer
  useEffect(() => {
    rendererRef.current = new VideoRenderer(720, 1280);
    const canvas = rendererRef.current.getCanvas();

    if (canvasRef.current) {
      const parent = canvasRef.current.parentElement;
      if (parent) {
        // Render initial frame
        rendererRef.current.drawFrame(scenes, 0, totalDuration, seriesTitle, episodeNumber);
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
    }
  }, [scenes, totalDuration, seriesTitle, episodeNumber]);

  // Main playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
      return;
    }

    lastTimeRef.current = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + delta;
        if (next >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animFrameId.current = requestAnimationFrame(loop);
    };

    animFrameId.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isPlaying, totalDuration]);

  // Draw frame on canvas whenever currentTime changes
  useEffect(() => {
    if (!rendererRef.current || !canvasRef.current) return;
    rendererRef.current.drawFrame(scenes, currentTime, totalDuration, seriesTitle, episodeNumber);

    const targetCtx = canvasRef.current.getContext('2d');
    if (targetCtx) {
      targetCtx.drawImage(
        rendererRef.current.getCanvas(),
        0,
        0,
        canvasRef.current.width,
        canvasRef.current.height
      );
    }
  }, [currentTime, scenes, totalDuration, seriesTitle, episodeNumber]);

  // Handle SpeechSynthesis narration preview
  useEffect(() => {
    if (!isPlaying || isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      window.speechSynthesis?.cancel();
      return;
    }

    // Find current scene
    let acc = 0;
    for (const scene of scenes) {
      if (currentTime >= acc && currentTime < acc + scene.duration) {
        // Trigger speech at the beginning of the scene
        const offset = currentTime - acc;
        if (offset < 0.25) {
          window.speechSynthesis.cancel();
          const utter = new SpeechSynthesisUtterance(scene.narration);
          utter.lang = 'ar-SA';
          utter.rate = 1.05;
          window.speechSynthesis.speak(utter);
        }
        break;
      }
      acc += scene.duration;
    }
  }, [currentTime, isPlaying, isMuted, scenes]);

  const togglePlay = () => {
    if (currentTime >= totalDuration) setCurrentTime(0);
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
  };

  const handleExportBlob = async () => {
    if (!rendererRef.current) return;
    setIsRendering(true);
    setRenderProgress(0);

    try {
      const blob = await rendererRef.current.renderToBlob(
        scenes,
        totalDuration,
        (progress) => {
          setRenderProgress(progress);
        },
        seriesTitle,
        episodeNumber
      );

      const url = URL.createObjectURL(blob);
      setRenderedBlobUrl(url);
    } catch (err) {
      console.error('Rendering error:', err);
      alert('حدث خطأ أثناء تصدير الفيديو');
    } finally {
      setIsRendering(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* 9:16 Vertical Video Frame with Reel styling */}
      <div className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-950 group">
        <canvas
          ref={canvasRef}
          width={720}
          height={1280}
          className="w-full h-full object-cover cursor-pointer"
          onClick={togglePlay}
        />

        {/* Play/Pause Overlay center button */}
        {!isPlaying && (
          <button
            onClick={togglePlay}
            className="absolute inset-0 m-auto w-20 h-20 rounded-full bg-cyan-500/90 hover:bg-cyan-400 text-white flex items-center justify-center shadow-lg shadow-cyan-500/40 backdrop-blur-sm transition-all transform hover:scale-110 z-20"
          >
            <Play className="w-10 h-10 fill-current translate-x-1" />
          </button>
        )}

        {/* Top Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-10">
          <div className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-cyan-400 font-semibold flex items-center gap-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            معاينة 9:16 Facebook Reel
          </div>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white backdrop-blur-md transition"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Bottom Floating Bar */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/85 backdrop-blur-md p-3 rounded-2xl border border-slate-700/70 text-white shadow-xl z-10 flex flex-col gap-2">
          {/* Timeline slider */}
          <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
            <span>{formatSeconds(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={totalDuration}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-cyan-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <span>{formatSeconds(totalDuration)}</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="p-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>
              <button
                onClick={() => setCurrentTime(0)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="إعادة من البداية"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
              {scenes.length} مشاهد | 1080p
            </span>
          </div>
        </div>

        {/* Render Progress Modal */}
        {isRendering && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin mb-4"></div>
            <h4 className="text-lg font-bold text-white mb-2">جاري تصدير ومعالجة الفيديو 9:16...</h4>
            <p className="text-sm text-slate-400 mb-4 font-mono">{renderProgress}% مكتمل</p>
            <div className="w-full max-w-xs bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-purple-600 h-2.5 transition-all duration-200"
                style={{ width: `${renderProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons underneath player */}
      <div className="grid grid-cols-2 gap-3 w-full mt-4">
        {renderedBlobUrl ? (
          <a
            href={renderedBlobUrl}
            download={`novapulse_reel_${Date.now()}.webm`}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5"
          >
            <Download className="w-4 h-4" />
            تحميل الفيديو
          </a>
        ) : (
          <button
            onClick={handleExportBlob}
            disabled={isRendering}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            تصدير الفيديو (MP4/WebM)
          </button>
        )}

        {onPublishFacebook && (
          <button
            onClick={onPublishFacebook}
            disabled={isPublishing}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#1877f2] hover:bg-[#166fe5] text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            <Share2 className="w-4 h-4" />
            {isPublishing ? 'جاري النشر على فيسبوك...' : 'نشر على فيسبوك'}
          </button>
        )}
      </div>
    </div>
  );
};
