import { Scene, VisualStyleType } from '../types/index.ts';

export interface RenderProgressCallback {
  (progress: number, currentSceneIndex: number, statusText: string): void;
}

export class VideoRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private audioCtx: AudioContext | null = null;
  private isRendering = false;

  constructor(width = 720, height = 1280) {
    this.width = width;
    this.height = height;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('تعذر إنشاء سياق رسم Canvas 2D');
    this.ctx = context;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Draw a single frame at a specific timestamp
   */
  drawFrame(
    scenes: Scene[],
    currentTime: number,
    totalDuration: number,
    seriesTitle?: string,
    episodeNum?: number
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Determine current active scene
    let accumulatedTime = 0;
    let currentScene: Scene = scenes[0] || {
      id: '1',
      order: 1,
      narration: '',
      duration: 10,
      visualPrompt: '',
      visualType: 'neon_geometry',
      subtitle: '',
    };
    let sceneLocalTime = 0;

    for (const scene of scenes) {
      if (currentTime >= accumulatedTime && currentTime < accumulatedTime + scene.duration) {
        currentScene = scene;
        sceneLocalTime = currentTime - accumulatedTime;
        break;
      }
      accumulatedTime += scene.duration;
    }

    // 1. Draw Visual Background
    this.renderVisualBackground(currentScene.visualType, currentTime, sceneLocalTime);

    // 2. Draw Vignette & Overlay Shadow
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
    grad.addColorStop(0.25, 'rgba(0, 0, 0, 0.2)');
    grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 3. Draw Header (Branding & Series Info)
    this.renderHeader(seriesTitle, episodeNum, currentTime);

    // 4. Draw Center Kinetic Text (Narration highlight)
    this.renderCenterKineticText(currentScene, sceneLocalTime);

    // 5. Draw Lower Subtitle & Captions Box
    this.renderSubtitleBox(currentScene.subtitle || currentScene.narration);

    // 6. Draw Bottom Progress Scrubber Bar
    this.renderProgressBar(currentTime, totalDuration);
  }

  private renderVisualBackground(type: VisualStyleType, time: number, sceneTime: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    switch (type) {
      case 'neon_geometry': {
        // Deep cyber backdrop
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);

        // Perspective floor grid
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 2;
        const horizon = h * 0.65;
        const gridOffset = (time * 80) % 60;

        for (let y = horizon; y < h; y += 25) {
          const depth = (y - horizon) / (h - horizon);
          ctx.beginPath();
          ctx.moveTo(0, y + (gridOffset * depth) % 25);
          ctx.lineTo(w, y + (gridOffset * depth) % 25);
          ctx.stroke();
        }

        const centerVanishingX = w / 2;
        for (let x = -w; x < w * 2; x += 60) {
          ctx.beginPath();
          ctx.moveTo(centerVanishingX, horizon);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        // Floating neon rotating wireframe polyhedron
        const cx = w / 2;
        const cy = h * 0.38;
        const radius = 110 + Math.sin(time * 3) * 15;
        const rot = time * 0.8;

        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ec4899';
        ctx.shadowBlur = 25;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = rot + (i * Math.PI) / 3;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius * 0.7;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner glowing core
        ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 35;
        ctx.beginPath();
        ctx.arc(cx, cy, 35 + Math.sin(time * 4) * 8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'tech_grid': {
        // Futuristic Tech Matrix
        ctx.fillStyle = '#050c18';
        ctx.fillRect(0, 0, w, h);

        // Circuit nodes and connecting lines
        const nodeCount = 18;
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.lineWidth = 1.5;

        const nodes: { x: number; y: number }[] = [];
        for (let i = 0; i < nodeCount; i++) {
          const seed = i * 137.5;
          const x = (Math.sin(seed + time * 0.2) * 0.4 + 0.5) * w;
          const y = (Math.cos(seed * 0.7 + time * 0.15) * 0.4 + 0.5) * h;
          nodes.push({ x, y });
        }

        // Draw connections
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const dist = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y);
            if (dist < 220) {
              ctx.beginPath();
              ctx.moveTo(nodes[i].x, nodes[i].y);
              ctx.lineTo(nodes[j].x, nodes[j].y);
              ctx.stroke();
            }
          }
        }

        // Draw glowing nodes
        for (const n of nodes) {
          ctx.fillStyle = '#38bdf8';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'abstract_wave': {
        // Iridescent Fluid Waves
        const bgGrad = ctx.createLinearGradient(0, 0, w, h);
        bgGrad.addColorStop(0, '#1e1b4b');
        bgGrad.addColorStop(0.5, '#311042');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Sinusoidal flowing bands
        const bands = 5;
        for (let b = 0; b < bands; b++) {
          const offset = b * 0.6;
          const baseY = h * 0.35 + b * 50;

          ctx.beginPath();
          ctx.moveTo(0, h);
          ctx.lineTo(0, baseY);

          for (let x = 0; x <= w; x += 15) {
            const y =
              baseY +
              Math.sin(x * 0.008 + time * 2 + offset) * 45 +
              Math.cos(x * 0.004 - time + offset) * 30;
            ctx.lineTo(x, y);
          }

          ctx.lineTo(w, h);
          ctx.closePath();

          const colors = [
            'rgba(168, 85, 247, 0.25)',
            'rgba(236, 72, 153, 0.3)',
            'rgba(59, 130, 246, 0.25)',
            'rgba(20, 184, 166, 0.35)',
            'rgba(244, 63, 94, 0.3)',
          ];
          ctx.fillStyle = colors[b % colors.length];
          ctx.fill();
        }
        break;
      }

      case 'particles': {
        // Cosmic Galaxy Particles
        ctx.fillStyle = '#060814';
        ctx.fillRect(0, 0, w, h);

        // Glowing center nebula
        const nebGrad = ctx.createRadialGradient(w / 2, h * 0.45, 20, w / 2, h * 0.45, 300);
        nebGrad.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
        nebGrad.addColorStop(0.6, 'rgba(236, 72, 153, 0.15)');
        nebGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = nebGrad;
        ctx.fillRect(0, 0, w, h);

        // Floating orbs & stars
        const pCount = 50;
        for (let i = 0; i < pCount; i++) {
          const speed = (i % 5) * 0.4 + 0.5;
          const px = ((i * 123.456 + time * 30 * speed) % (w + 40)) - 20;
          const py = ((i * 789.012 + Math.sin(time + i) * 80) % (h + 40)) - 20;
          const size = (i % 4) + 2;

          ctx.fillStyle = i % 2 === 0 ? '#fde047' : '#67e8f9';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'gradient_pulse': {
        // Energetic Pulsing Aura
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h * 0.4;
        const pulse = Math.sin(time * 3) * 40;

        // Expanding concentric energy rings
        for (let r = 80; r < 400; r += 70) {
          const currentRadius = (r + (time * 60) % 200) + pulse;
          const alpha = Math.max(0, 1 - currentRadius / 450) * 0.6;
          ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
          ctx.lineWidth = 4;
          ctx.shadowColor = '#0ea5e9';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }

      case 'cinematic_flame':
      default: {
        // Warm cinematic embers
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#1c0a00');
        grad.addColorStop(0.6, '#381200');
        grad.addColorStop(1, '#050200');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Rising embers
        for (let i = 0; i < 40; i++) {
          const seed = i * 47.1;
          const x = (Math.sin(seed + time) * 0.45 + 0.5) * w;
          const y = h - ((seed * 10 + time * 90) % (h * 1.1));
          const size = (i % 3) + 2;

          ctx.fillStyle = '#ff7b00';
          ctx.shadowColor = '#ff3c00';
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
    }

    ctx.restore();
  }

  private renderHeader(seriesTitle?: string, episodeNum?: number, time = 0) {
    const ctx = this.ctx;
    const w = this.width;

    ctx.save();

    // Top logo badge
    ctx.font = 'bold 26px Cairo, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('NovaPulse AI Studio', w - 40, 75);

    // Subtle pulsing red/cyan indicator dot
    const pulseAlpha = Math.sin(time * 5) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(6, 182, 212, ${pulseAlpha})`;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(w - 20, 68, 6, 0, Math.PI * 2);
    ctx.fill();

    // Facebook Reels badge on left
    ctx.font = '600 20px Cairo, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1877f2';
    ctx.fillRect(40, 50, 110, 34);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Facebook Reel', 48, 74);

    // Series title and episode tag if applicable
    if (seriesTitle) {
      ctx.textAlign = 'center';
      ctx.font = '600 22px Cairo, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const epText = episodeNum ? `الحلقة ${episodeNum} | ` : '';
      ctx.fillText(`${epText}${seriesTitle}`, w / 2, 120);
    }

    ctx.restore();
  }

  private renderCenterKineticText(scene: Scene, sceneTime: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Dynamic Entrance scale
    const enterScale = Math.min(1, sceneTime * 3);
    const textY = h * 0.46;

    // Glowing badge backdrop behind text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 20;

    const boxW = w * 0.88;
    const boxH = 180;
    const boxX = (w - boxW) / 2;
    const boxY = textY - boxH / 2;

    this.roundRect(ctx, boxX, boxY, boxW, boxH, 20);
    ctx.fill();

    // Border with neon gradient
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Kinetic typography lines
    ctx.font = 'bold 36px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const words = (scene.subtitle || scene.narration).split(' ');
    const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;

    if (line2) {
      ctx.fillText(line1, w / 2, textY - 25);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(line2, w / 2, textY + 30);
    } else {
      ctx.fillText(line1, w / 2, textY);
    }

    ctx.restore();
  }

  private renderSubtitleBox(text: string) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    const boxY = h * 0.8;
    const boxW = w * 0.9;
    const boxX = (w - boxW) / 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, boxX, boxY, boxW, 110, 16);
    ctx.fill();
    ctx.stroke();

    // Arabic text wrap
    ctx.font = '600 24px Cairo, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f8fafc';

    // Wrap lines
    this.wrapText(ctx, text, w / 2, boxY + 55, boxW - 40, 32);

    ctx.restore();
  }

  private renderProgressBar(currentTime: number, totalDuration: number) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    const progress = Math.min(1, Math.max(0, currentTime / (totalDuration || 1)));

    ctx.save();
    const barY = h - 20;
    const barH = 8;

    // Track
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, barY, w, barH);

    // Active Fill with vibrant cyan gradient
    const grad = ctx.createLinearGradient(0, barY, w * progress, barY);
    grad.addColorStop(0, '#06b6d4');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, barY, w * progress, barH);

    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line);
        line = words[n] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let k = 0; k < lines.length; k++) {
      ctx.fillText(lines[k].trim(), x, startY + k * lineHeight);
    }
  }

  /**
   * Synthesize royalty-free background chords using Web Audio API
   */
  private createSynthesizedAudioTrack(duration: number): AudioNode | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      this.audioCtx = new AudioCtx();

      const masterGain = this.audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.35, this.audioCtx.currentTime);

      // Chords sequence: Em, C, G, D (Epic inspiring progression)
      const chordNotes = [
        [164.81, 196.0, 246.94], // E3, G3, B3
        [130.81, 164.81, 196.0], // C3, E3, G3
        [196.0, 246.94, 293.66], // G3, B3, D4
        [146.83, 220.0, 293.66], // D3, A3, D4
      ];

      const chordDuration = 4;
      const totalChords = Math.ceil(duration / chordDuration);

      for (let i = 0; i < totalChords; i++) {
        const chord = chordNotes[i % chordNotes.length];
        const startTime = this.audioCtx.currentTime + i * chordDuration;

        chord.forEach((freq) => {
          const osc = this.audioCtx!.createOscillator();
          const noteGain = this.audioCtx!.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          // Gentle fade in / out envelope
          noteGain.gain.setValueAtTime(0, startTime);
          noteGain.gain.linearRampToValueAtTime(0.08, startTime + 0.4);
          noteGain.gain.linearRampToValueAtTime(0.06, startTime + chordDuration - 0.4);
          noteGain.gain.linearRampToValueAtTime(0, startTime + chordDuration);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(startTime + chordDuration);
        });
      }

      return masterGain;
    } catch (err) {
      console.warn('Web Audio synthesis not supported in this environment:', err);
      return null;
    }
  }

  /**
   * Record entire video to a downloadable Blob (.webm / .mp4 compatible)
   */
  async renderToBlob(
    scenes: Scene[],
    totalDuration: number,
    onProgress?: RenderProgressCallback,
    seriesTitle?: string,
    episodeNum?: number
  ): Promise<Blob> {
    if (this.isRendering) throw new Error('الرندر قيد التشغيل بالفعل');
    this.isRendering = true;

    return new Promise(async (resolve, reject) => {
      try {
        const fps = 30;
        const totalFrames = Math.floor(totalDuration * fps);
        const canvasStream = this.canvas.captureStream(fps);

        // Optional Audio synthesis integration
        const audioNode = this.createSynthesizedAudioTrack(totalDuration);
        let combinedStream = canvasStream;

        if (audioNode && this.audioCtx) {
          const dest = this.audioCtx.createMediaStreamDestination();
          audioNode.connect(dest);
          dest.connect(this.audioCtx.destination);
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...dest.stream.getAudioTracks(),
          ]);
        }

        // Setup MediaRecorder
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/mp4')
          ? 'video/mp4'
          : 'video/webm';

        const recorder = new MediaRecorder(combinedStream, {
          mimeType,
          videoBitsPerSecond: 4500000, // 4.5 Mbps for crisp vertical video
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          this.isRendering = false;
          if (this.audioCtx) {
            this.audioCtx.close().catch(() => {});
          }
          const finalBlob = new Blob(chunks, { type: mimeType });
          resolve(finalBlob);
        };

        recorder.start();

        // Render frames in real-time or stepped
        const frameIntervalMs = 1000 / fps;
        let currentFrame = 0;

        const renderStep = () => {
          if (currentFrame >= totalFrames) {
            recorder.stop();
            return;
          }

          const currentTime = currentFrame / fps;
          this.drawFrame(scenes, currentTime, totalDuration, seriesTitle, episodeNum);

          if (onProgress && currentFrame % 10 === 0) {
            const percent = Math.round((currentFrame / totalFrames) * 100);
            onProgress(percent, 0, `جاري تصيير الإطارات: ${percent}%`);
          }

          currentFrame++;
          setTimeout(renderStep, frameIntervalMs);
        };

        renderStep();
      } catch (err) {
        this.isRendering = false;
        reject(err);
      }
    });
  }
}
