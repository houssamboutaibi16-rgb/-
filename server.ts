import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import authRoutes from './server/routes/auth.ts';
import facebookRoutes from './server/routes/facebook.ts';
import aiRoutes from './server/routes/ai.ts';
import videoRoutes from './server/routes/videos.ts';
import seriesRoutes from './server/routes/series.ts';
import queueRoutes from './server/routes/queue.ts';
import dashboardRoutes from './server/routes/dashboard.ts';
import exportRoutes from './server/routes/export.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/facebook', facebookRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/series', seriesRoutes);
  app.use('/api/queue', queueRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/export', exportRoutes);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NovaPulse AI Studio',
      time: new Date().toISOString(),
    });
  });

  // Full Project ZIP download endpoint for external hosting export
  app.get('/api/download-project', (req, res) => {
    res.redirect('/api/export/download');
  });

  if (!isProd) {
    // Development mode: Mount Vite dev server middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve built static files
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NovaPulse AI Studio server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
