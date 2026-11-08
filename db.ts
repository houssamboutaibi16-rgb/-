import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface UserSettings {
  openRouterApiKey?: string;
  customModel?: string;
  autoProduceEnabled: boolean;
  dailyTarget: number;
  publishTimes: string[];
  preferredTheme: string;
  preferredStyle: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
}

export interface FacebookConnection {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  pageAccessToken?: string; // Stored securely on server
  userAccessToken?: string;
  status: 'connected' | 'expired' | 'needs_reconnect' | 'disconnected';
  lastChecked?: string;
  expiresAt?: string;
  category?: string;
  followersCount?: number;
  availablePages?: FacebookPage[];
  lastError?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  settings: UserSettings;
  facebook: FacebookConnection;
}

export interface Scene {
  id: string;
  order: number;
  narration: string;
  duration: number;
  visualPrompt: string;
  visualType: 'abstract_wave' | 'particles' | 'gradient_pulse' | 'tech_grid' | 'neon_geometry' | 'cinematic_flame';
  subtitle: string;
  bgMusicMood?: string;
}

export interface VideoScript {
  hook: string;
  body: string;
  cta: string;
  scenes: Scene[];
}

export interface VideoItem {
  id: string;
  userId: string;
  seriesId?: string;
  seriesTitle?: string;
  episodeNumber?: number;
  title: string;
  description: string;
  hashtags: string[];
  duration: number;
  aspectRatio: '9:16';
  status: 'draft' | 'ready' | 'scheduled' | 'publishing' | 'published' | 'failed';
  script: VideoScript;
  videoFilePath?: string;
  videoDataUrl?: string;
  facebookPostId?: string;
  facebookUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  metrics: {
    views: number;
    likes: number;
    shares: number;
    comments: number;
  };
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface SeriesItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  topic: string;
  language: 'ar' | 'darija' | 'en';
  style: 'educational' | 'dramatic' | 'storytelling' | 'motivational' | 'tech' | 'curiosity';
  targetDuration: number;
  currentEpisode: number;
  episodesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItem {
  id: string;
  userId: string;
  videoId: string;
  videoTitle: string;
  scheduledTime: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  lastAttempt?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  type: 'ai_generation' | 'facebook_publish' | 'auth' | 'video_render' | 'system' | 'error';
  title: string;
  description: string;
  status: 'success' | 'warning' | 'error' | 'info';
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Session {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}

interface DatabaseSchema {
  users: Record<string, User>;
  sessions: Record<string, Session>;
  series: Record<string, SeriesItem>;
  videos: Record<string, VideoItem>;
  queue: Record<string, QueueItem>;
  activityLogs: ActivityLog[];
  chatMessages: Record<string, ChatMessage[]>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

class Database {
  private data: DatabaseSchema = {
    users: {},
    sessions: {},
    series: {},
    videos: {},
    queue: {},
    activityLogs: [],
    chatMessages: {},
  };

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all collections exist
        this.data.users = this.data.users || {};
        this.data.sessions = this.data.sessions || {};
        this.data.series = this.data.series || {};
        this.data.videos = this.data.videos || {};
        this.data.queue = this.data.queue || {};
        this.data.activityLogs = this.data.activityLogs || [];
        this.data.chatMessages = this.data.chatMessages || {};
      } catch (err) {
        console.error('Error loading database file, creating fresh store:', err);
        this.save();
      }
    } else {
      this.save();
    }

    // Ensure default starter creator exists for immediate evaluation
    if (!this.findUserByEmail('creator@novapulse.ai')) {
      const { salt, hash } = this.hashPassword('password123');
      this.createUser('أحمد المنصوري', 'creator@novapulse.ai', hash, salt);
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save database file:', err);
    }
  }

  // Password utilities
  hashPassword(password: string): { salt: string; hash: string } {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  verifyPassword(password: string, salt: string, hash: string): boolean {
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return testHash === hash;
  }

  // User methods
  createUser(name: string, email: string, passwordHash: string, salt: string): User {
    const id = crypto.randomUUID();
    const newUser: User = {
      id,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
      settings: {
        autoProduceEnabled: false,
        dailyTarget: 2,
        publishTimes: ['14:00', '20:00'],
        preferredTheme: 'dark',
        preferredStyle: 'cinematic',
      },
      facebook: {
        connected: false,
        status: 'disconnected',
      },
    };

    this.data.users[id] = newUser;
    this.save();

    this.addLog(id, 'auth', 'إنشاء حساب جديد', `تم تسجيل حساب المستخدم بنجاح (${email})`, 'success');
    return newUser;
  }

  findUserByEmail(email: string): User | undefined {
    const normalized = email.toLowerCase().trim();
    return Object.values(this.data.users).find((u) => u.email === normalized);
  }

  findUserById(id: string): User | undefined {
    return this.data.users[id];
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.data.users[id];
    if (!user) return undefined;
    this.data.users[id] = { ...user, ...updates };
    this.save();
    return this.data.users[id];
  }

  // Session methods
  createSession(userId: string): Session {
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    const session: Session = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
    this.data.sessions[token] = session;
    this.save();
    return session;
  }

  findSession(token: string): Session | undefined {
    const session = this.data.sessions[token];
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      delete this.data.sessions[token];
      this.save();
      return undefined;
    }
    return session;
  }

  deleteSession(token: string): void {
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
    }
  }

  // Safe user representation (no secrets)
  getSafeUser(user: User) {
    const fbSafe = {
      connected: user.facebook.connected,
      pageId: user.facebook.pageId,
      pageName: user.facebook.pageName,
      status: user.facebook.status,
      lastChecked: user.facebook.lastChecked,
      expiresAt: user.facebook.expiresAt,
      category: user.facebook.category,
      followersCount: user.facebook.followersCount,
      lastError: user.facebook.lastError,
      hasToken: Boolean(user.facebook.pageAccessToken),
      pageCount: user.facebook.availablePages?.length || 0,
      availablePages: (user.facebook.availablePages || []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        tasks: p.tasks,
      })),
    };

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      settings: {
        ...user.settings,
        hasCustomKey: Boolean(user.settings.openRouterApiKey),
        // Mask key for safety
        openRouterApiKeyMasked: user.settings.openRouterApiKey
          ? `${user.settings.openRouterApiKey.substring(0, 7)}...${user.settings.openRouterApiKey.slice(-4)}`
          : null,
      },
      facebook: fbSafe,
    };
  }

  // Series methods (Strictly isolated by userId)
  getSeriesByUser(userId: string): SeriesItem[] {
    return Object.values(this.data.series)
      .filter((s) => s.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getSeriesById(seriesId: string, userId: string): SeriesItem | undefined {
    const series = this.data.series[seriesId];
    if (series && series.userId === userId) {
      return series;
    }
    return undefined;
  }

  createSeries(userId: string, data: Omit<SeriesItem, 'id' | 'userId' | 'currentEpisode' | 'episodesCount' | 'createdAt' | 'updatedAt'>): SeriesItem {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const series: SeriesItem = {
      ...data,
      id,
      userId,
      currentEpisode: 0,
      episodesCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.data.series[id] = series;
    this.save();
    this.addLog(userId, 'system', 'إنشاء سلسلة جديدة', `تم إنشاء سلسلة: "${series.title}"`, 'success');
    return series;
  }

  updateSeries(seriesId: string, userId: string, updates: Partial<SeriesItem>): SeriesItem | undefined {
    const series = this.getSeriesById(seriesId, userId);
    if (!series) return undefined;
    const updated = { ...series, ...updates, updatedAt: new Date().toISOString() };
    this.data.series[seriesId] = updated;
    this.save();
    return updated;
  }

  deleteSeries(seriesId: string, userId: string): boolean {
    const series = this.getSeriesById(seriesId, userId);
    if (!series) return false;
    delete this.data.series[seriesId];
    this.save();
    return true;
  }

  // Video methods (Strictly isolated by userId)
  getVideosByUser(userId: string): VideoItem[] {
    return Object.values(this.data.videos)
      .filter((v) => v.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getVideoById(videoId: string, userId: string): VideoItem | undefined {
    const v = this.data.videos[videoId];
    if (v && v.userId === userId) {
      return v;
    }
    return undefined;
  }

  createVideo(userId: string, data: Partial<VideoItem>): VideoItem {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const video: VideoItem = {
      id,
      userId,
      seriesId: data.seriesId,
      seriesTitle: data.seriesTitle,
      episodeNumber: data.episodeNumber,
      title: data.title || 'فيديو بدون عنوان',
      description: data.description || '',
      hashtags: data.hashtags || ['#NovaPulse', '#Reels', '#ذكاء_اصطناعي'],
      duration: data.duration || 60,
      aspectRatio: '9:16',
      status: data.status || 'draft',
      script: data.script || {
        hook: '',
        body: '',
        cta: '',
        scenes: [],
      },
      videoFilePath: data.videoFilePath,
      videoDataUrl: data.videoDataUrl,
      facebookPostId: data.facebookPostId,
      facebookUrl: data.facebookUrl,
      scheduledAt: data.scheduledAt,
      publishedAt: data.publishedAt,
      metrics: {
        views: 0,
        likes: 0,
        shares: 0,
        comments: 0,
      },
      createdAt: now,
      updatedAt: now,
      error: data.error,
    };

    this.data.videos[id] = video;

    // If belongs to a series, update series count
    if (video.seriesId) {
      const s = this.getSeriesById(video.seriesId, userId);
      if (s) {
        s.episodesCount += 1;
        s.currentEpisode = Math.max(s.currentEpisode, video.episodeNumber || s.episodesCount);
        s.updatedAt = now;
      }
    }

    this.save();
    this.addLog(userId, 'ai_generation', 'إنشاء مسودة فيديو', `تم تحضير محتوى فيديو: "${video.title}"`, 'info');
    return video;
  }

  updateVideo(videoId: string, userId: string, updates: Partial<VideoItem>): VideoItem | undefined {
    const video = this.getVideoById(videoId, userId);
    if (!video) return undefined;
    const updated = { ...video, ...updates, updatedAt: new Date().toISOString() };
    this.data.videos[videoId] = updated;
    this.save();
    return updated;
  }

  deleteVideo(videoId: string, userId: string): boolean {
    const video = this.getVideoById(videoId, userId);
    if (!video) return false;
    delete this.data.videos[videoId];

    // Remove from queue if exists
    for (const [qId, qItem] of Object.entries(this.data.queue)) {
      if (qItem.videoId === videoId && qItem.userId === userId) {
        delete this.data.queue[qId];
      }
    }

    this.save();
    return true;
  }

  // Queue methods (Strictly isolated by userId)
  getQueueByUser(userId: string): QueueItem[] {
    return Object.values(this.data.queue)
      .filter((q) => q.userId === userId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  addToQueue(userId: string, videoId: string, scheduledTime: string): QueueItem {
    const id = crypto.randomUUID();
    const video = this.getVideoById(videoId, userId);
    const queueItem: QueueItem = {
      id,
      userId,
      videoId,
      videoTitle: video ? video.title : 'فيديو مجدول',
      scheduledTime,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };

    this.data.queue[id] = queueItem;
    if (video) {
      this.updateVideo(videoId, userId, {
        status: 'scheduled',
        scheduledAt: scheduledTime,
      });
    }

    this.save();
    this.addLog(userId, 'system', 'جدولة نشر فيديو', `تمت إضافة الفيديو إلى قائمة النشر لوقت: ${scheduledTime}`, 'info');
    return queueItem;
  }

  updateQueueItem(id: string, userId: string, updates: Partial<QueueItem>): QueueItem | undefined {
    const item = this.data.queue[id];
    if (!item || item.userId !== userId) return undefined;
    const updated = { ...item, ...updates };
    this.data.queue[id] = updated;
    this.save();
    return updated;
  }

  deleteQueueItem(id: string, userId: string): boolean {
    const item = this.data.queue[id];
    if (!item || item.userId !== userId) return false;
    delete this.data.queue[id];
    this.save();
    return true;
  }

  // Activity logs (Strictly isolated by userId)
  addLog(
    userId: string,
    type: ActivityLog['type'],
    title: string,
    description: string,
    status: ActivityLog['status'] = 'info'
  ) {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      userId,
      type,
      title,
      description,
      status,
      timestamp: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    // Keep max 200 logs total
    if (this.data.activityLogs.length > 300) {
      this.data.activityLogs = this.data.activityLogs.slice(0, 300);
    }
    this.save();
  }

  getLogsByUser(userId: string, limit = 50): ActivityLog[] {
    return this.data.activityLogs
      .filter((l) => l.userId === userId)
      .slice(0, limit);
  }

  // Chat messages per user
  getChatByUser(userId: string): ChatMessage[] {
    return this.data.chatMessages[userId] || [];
  }

  addChatMessage(userId: string, role: 'user' | 'assistant', content: string): ChatMessage {
    if (!this.data.chatMessages[userId]) {
      this.data.chatMessages[userId] = [];
    }
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    this.data.chatMessages[userId].push(msg);
    // Keep last 100 messages
    if (this.data.chatMessages[userId].length > 100) {
      this.data.chatMessages[userId] = this.data.chatMessages[userId].slice(-100);
    }
    this.save();
    return msg;
  }

  clearChat(userId: string): void {
    this.data.chatMessages[userId] = [];
    this.save();
  }

  // Dashboard stats aggregated strictly for this user
  getDashboardStats(userId: string) {
    const videos = this.getVideosByUser(userId);
    const series = this.getSeriesByUser(userId);
    const queue = this.getQueueByUser(userId);
    const user = this.findUserById(userId);

    const publishedCount = videos.filter((v) => v.status === 'published').length;
    const readyCount = videos.filter((v) => v.status === 'ready').length;
    const scheduledCount = videos.filter((v) => v.status === 'scheduled').length;
    const processingCount = videos.filter((v) => v.status === 'publishing' || v.status === 'draft').length;

    const totalViews = videos.reduce((acc, v) => acc + (v.metrics?.views || 0), 0);
    const totalLikes = videos.reduce((acc, v) => acc + (v.metrics?.likes || 0), 0);
    const totalShares = videos.reduce((acc, v) => acc + (v.metrics?.shares || 0), 0);
    const totalComments = videos.reduce((acc, v) => acc + (v.metrics?.comments || 0), 0);

    return {
      totalVideos: videos.length,
      publishedVideos: publishedCount,
      scheduledVideos: scheduledCount,
      readyVideos: readyCount,
      processingVideos: processingCount,
      totalSeries: series.length,
      queueCount: queue.length,
      metrics: {
        totalViews,
        totalLikes,
        totalShares,
        totalComments,
      },
      facebook: user ? this.getSafeUser(user).facebook : null,
      autoProduceEnabled: user?.settings?.autoProduceEnabled || false,
      dailyTarget: user?.settings?.dailyTarget || 2,
    };
  }
}

export const db = new Database();
