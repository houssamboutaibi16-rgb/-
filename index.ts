export type VisualStyleType =
  | 'abstract_wave'
  | 'particles'
  | 'gradient_pulse'
  | 'tech_grid'
  | 'neon_geometry'
  | 'cinematic_flame';

export interface Scene {
  id: string;
  order: number;
  narration: string;
  duration: number; // in seconds
  visualPrompt: string;
  visualType: VisualStyleType;
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

export interface FacebookPageSummary {
  id: string;
  name: string;
  category?: string;
  tasks?: string[];
  followersCount?: number;
}

export interface FacebookStatus {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  status: 'connected' | 'expired' | 'needs_reconnect' | 'disconnected';
  lastChecked?: string;
  expiresAt?: string;
  category?: string;
  followersCount?: number;
  hasToken: boolean;
  pageCount: number;
  availablePages?: FacebookPageSummary[];
  lastError?: string;
}

export interface UserSettings {
  openRouterApiKeyMasked?: string | null;
  hasCustomKey: boolean;
  customModel?: string;
  autoProduceEnabled: boolean;
  dailyTarget: number;
  publishTimes: string[];
  preferredTheme: string;
  preferredStyle: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  settings: UserSettings;
  facebook: FacebookStatus;
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

export interface DashboardStats {
  totalVideos: number;
  publishedVideos: number;
  scheduledVideos: number;
  readyVideos: number;
  processingVideos: number;
  totalSeries: number;
  queueCount: number;
  metrics: {
    totalViews: number;
    totalLikes: number;
    totalShares: number;
    totalComments: number;
  };
  facebook: FacebookStatus | null;
  autoProduceEnabled: boolean;
  dailyTarget: number;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
