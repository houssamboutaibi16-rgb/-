import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

export interface BundleResult {
  zipPath: string;
  sizeBytes: number;
  filesIncluded: string[];
  createdAt: string;
}

export interface BundleOptions {
  outputPath?: string;
  sanitizeDatabase?: boolean;
}

/**
 * List of directories and patterns strictly excluded from the migration bundle
 * to prevent leaking secrets, bloated dependencies, or build artifacts.
 */
const EXCLUDED_PATTERNS = [
  /^node_modules(\/|\\|$)/,
  /^\.git(\/|\\|$)/,
  /^dist(\/|\\|$)/,
  /^\.cache(\/|\\|$)/,
  /__pycache__/,
  /\.pyc$/,
  /\.DS_Store$/,
  /\.zip$/,
  // Strictly exclude sensitive environment files with actual secrets
  /^\.env$/,
  /^\.env\.local$/,
  /^\.env\.production$/,
  /^\.env\.development$/,
  /^\.env\.staging$/,
];

/**
 * Validates whether a relative file path is safe and relevant to include in the bundle.
 */
function isPathAllowed(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');

  // Explicitly allow .env.example
  if (normalized === '.env.example') {
    return true;
  }

  // Check against exclusion patterns
  for (const pattern of EXCLUDED_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }

  return true;
}

/**
 * Sanitizes data/store.json to ensure no actual third-party Facebook Access Tokens
 * or private API keys are bundled into the export archive.
 */
function getSanitizedDatabaseContent(): string | null {
  const dbPath = path.resolve(process.cwd(), 'data', 'store.json');
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(dbPath, 'utf-8');
    const data = JSON.parse(raw);

    // Sanitize users
    if (data.users && typeof data.users === 'object') {
      for (const userId of Object.keys(data.users)) {
        const u = data.users[userId];
        if (u.settings) {
          // Remove plaintext OpenRouter key
          delete u.settings.openRouterApiKey;
        }
        if (u.facebook) {
          // Remove plaintext Facebook access tokens
          delete u.facebook.pageAccessToken;
          delete u.facebook.userAccessToken;
          u.facebook.status = 'disconnected';
          u.facebook.connected = false;
        }
      }
    }

    // Reset active sessions so no old bearer tokens are leaked
    data.sessions = {};

    return JSON.stringify(data, null, 2);
  } catch (err) {
    console.warn('Error reading or sanitizing database for bundle, using empty starter:', err);
    return JSON.stringify(
      {
        users: {},
        sessions: {},
        series: {},
        videos: {},
        queue: {},
        activityLogs: [],
        chatMessages: {},
      },
      null,
      2
    );
  }
}

/**
 * Main backend function that bundles all relevant application files into a ZIP archive,
 * strictly excluding sensitive environment variables (.env, .env.local, etc.) and credentials,
 * to facilitate easy, safe migration for the user.
 */
export async function bundleApplicationZip(options: BundleOptions = {}): Promise<BundleResult> {
  const rootDir = process.cwd();
  const outputDir = path.resolve(rootDir, 'public');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const destinationPath =
    options.outputPath || path.resolve(outputDir, 'novapulse-ai-studio-migration.zip');

  const filesIncluded: string[] = [];

  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destinationPath);
    const archive = new ZipArchive({
      zlib: { level: 9 }, // Maximum compression
    });

    output.on('close', () => {
      resolve({
        zipPath: destinationPath,
        sizeBytes: archive.pointer(),
        filesIncluded,
        createdAt: new Date().toISOString(),
      });
    });

    archive.on('error', (err: any) => {
      reject(err);
    });

    archive.pipe(output);

    // 1. Core single files
    const singleFiles = [
      'server.ts',
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'index.html',
      '.env.example',
      '.gitignore',
      'metadata.json',
      'README.md',
      'DEPLOYMENT_GUIDE.md',
      'Dockerfile',
      'docker-compose.yml',
    ];

    for (const file of singleFiles) {
      const fullPath = path.resolve(rootDir, file);
      if (fs.existsSync(fullPath) && isPathAllowed(file)) {
        archive.file(fullPath, { name: file });
        filesIncluded.push(file);
      }
    }

    // 2. Directories: src, server
    const targetDirs = ['src', 'server'];
    for (const dir of targetDirs) {
      const dirPath = path.resolve(rootDir, dir);
      if (fs.existsSync(dirPath)) {
        addDirectoryRecursive(dirPath, dir, archive, filesIncluded);
      }
    }

    // 3. Sanitized database storage (data/store.json)
    const sanitizedDb = getSanitizedDatabaseContent();
    if (sanitizedDb) {
      archive.append(sanitizedDb, { name: 'data/store.json' });
      filesIncluded.push('data/store.json (Sanitized - no secrets)');
    }

    archive.finalize();
  });
}

function addDirectoryRecursive(
  currentPath: string,
  relPrefix: string,
  archive: any,
  filesIncluded: string[]
) {
  const items = fs.readdirSync(currentPath);

  for (const item of items) {
    const fullItemPath = path.join(currentPath, item);
    const relItemPath = path.join(relPrefix, item).replace(/\\/g, '/');

    if (!isPathAllowed(relItemPath)) {
      continue;
    }

    const stat = fs.statSync(fullItemPath);
    if (stat.isDirectory()) {
      addDirectoryRecursive(fullItemPath, relItemPath, archive, filesIncluded);
    } else if (stat.isFile()) {
      archive.file(fullItemPath, { name: relItemPath });
      filesIncluded.push(relItemPath);
    }
  }
}
