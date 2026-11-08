import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { bundleApplicationZip } from '../bundler.ts';

const router = Router();

// Stream or download dynamically generated clean migration bundle
router.get('/download', async (req: Request, res: Response) => {
  try {
    const result = await bundleApplicationZip();

    if (!fs.existsSync(result.zipPath)) {
      return res.status(500).json({ error: 'تعذر إنشاء ملف الأرشيف المضغوط' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="novapulse-ai-studio-migration.zip"'
    );
    res.setHeader('Content-Length', result.sizeBytes);

    const filestream = fs.createReadStream(result.zipPath);
    filestream.pipe(res);
  } catch (err: any) {
    console.error('Failed to create bundle:', err);
    res.status(500).json({ error: `فشل إنشاء حزمة الترحيل: ${err.message}` });
  }
});

// Get bundle details and security verification
router.get('/info', async (req: Request, res: Response) => {
  try {
    const result = await bundleApplicationZip();
    res.json({
      success: true,
      filename: 'novapulse-ai-studio-migration.zip',
      sizeBytes: result.sizeBytes,
      sizeFormatted: `${(result.sizeBytes / 1024).toFixed(2)} KB`,
      totalFiles: result.filesIncluded.length,
      filesIncluded: result.filesIncluded,
      exclusionsApplied: [
        '.env (Excluded for security)',
        '.env.local (Excluded for security)',
        '.env.production (Excluded for security)',
        'node_modules (Excluded - install via npm install)',
        '.git (Excluded)',
        'dist (Excluded - rebuild via npm run build)',
        'User Facebook Access Tokens (Sanitized & removed)',
        'Private API Keys (Sanitized & removed)',
      ],
      createdAt: result.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
