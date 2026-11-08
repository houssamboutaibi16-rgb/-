import {
  User,
  VideoItem,
  SeriesItem,
  QueueItem,
  ActivityLog,
  DashboardStats,
  ChatMessage,
  FacebookStatus,
  FacebookPageSummary,
} from '../types/index.ts';

const TOKEN_KEY = 'novapulse_auth_token';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  hasToken(): boolean {
    return Boolean(this.getToken());
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'حدث خطأ في معالجة الطلب');
    }

    return data as T;
  }

  // Auth
  async register(name: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore if session already dead
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser(): Promise<User> {
    const res = await this.request<{ user: User }>('/auth/me');
    return res.user;
  }

  async updateProfile(updates: { name?: string; settings?: any }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await this.request<{ stats: DashboardStats }>('/dashboard/stats');
    return res.stats;
  }

  async getActivityLogs(limit = 40): Promise<ActivityLog[]> {
    const res = await this.request<{ logs: ActivityLog[] }>(`/dashboard/logs?limit=${limit}`);
    return res.logs;
  }

  async toggleAutoProduction(): Promise<{ autoProduceEnabled: boolean; message: string; user: User }> {
    return this.request<{ autoProduceEnabled: boolean; message: string; user: User }>('/dashboard/toggle-auto', {
      method: 'POST',
    });
  }

  async triggerAutoBatch(): Promise<{ count: number; videos: VideoItem[]; message: string }> {
    return this.request<{ count: number; videos: VideoItem[]; message: string }>('/dashboard/trigger-auto-batch', {
      method: 'POST',
    });
  }

  // AI & Nova AI Chat
  async sendChatMessage(message: string): Promise<{ reply: string; modelUsed: string; provider: string }> {
    return this.request<{ reply: string; modelUsed: string; provider: string }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getChatHistory(): Promise<ChatMessage[]> {
    const res = await this.request<{ messages: ChatMessage[] }>('/ai/chat-history');
    return res.messages;
  }

  async clearChatHistory(): Promise<void> {
    await this.request('/ai/chat-history', { method: 'DELETE' });
  }

  async generateScript(params: {
    topic: string;
    seriesId?: string;
    style?: string;
    language?: string;
    duration?: number;
  }): Promise<{ script: any; modelUsed: string; provider: string }> {
    return this.request<{ script: any; modelUsed: string; provider: string }>('/ai/generate-script', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async suggestTopics(niche?: string): Promise<{ ideas: any[]; modelUsed: string }> {
    return this.request<{ ideas: any[]; modelUsed: string }>('/ai/suggest-topics', {
      method: 'POST',
      body: JSON.stringify({ niche }),
    });
  }

  // Videos
  async getVideos(): Promise<VideoItem[]> {
    const res = await this.request<{ videos: VideoItem[] }>('/videos');
    return res.videos;
  }

  async getVideo(id: string): Promise<VideoItem> {
    const res = await this.request<{ video: VideoItem }>(`/videos/${id}`);
    return res.video;
  }

  async createVideo(data: Partial<VideoItem>): Promise<VideoItem> {
    const res = await this.request<{ video: VideoItem }>('/videos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.video;
  }

  async updateVideo(id: string, updates: Partial<VideoItem>): Promise<VideoItem> {
    const res = await this.request<{ video: VideoItem }>(`/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.video;
  }

  async deleteVideo(id: string): Promise<void> {
    await this.request(`/videos/${id}`, { method: 'DELETE' });
  }

  async publishVideo(id: string): Promise<{ success: boolean; message: string; facebookUrl?: string; video: VideoItem }> {
    return this.request<{ success: boolean; message: string; facebookUrl?: string; video: VideoItem }>(
      `/videos/${id}/publish`,
      { method: 'POST' }
    );
  }

  // Series
  async getSeries(): Promise<SeriesItem[]> {
    const res = await this.request<{ series: SeriesItem[] }>('/series');
    return res.series;
  }

  async createSeries(data: {
    title: string;
    description: string;
    topic: string;
    language?: string;
    style?: string;
    targetDuration?: number;
  }): Promise<SeriesItem> {
    const res = await this.request<{ series: SeriesItem }>('/series', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.series;
  }

  async updateSeries(id: string, updates: Partial<SeriesItem>): Promise<SeriesItem> {
    const res = await this.request<{ series: SeriesItem }>(`/series/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    return res.series;
  }

  async deleteSeries(id: string): Promise<void> {
    await this.request(`/series/${id}`, { method: 'DELETE' });
  }

  async generateNextEpisode(seriesId: string): Promise<{ video: VideoItem; series: SeriesItem; message: string }> {
    return this.request<{ video: VideoItem; series: SeriesItem; message: string }>(
      `/series/${seriesId}/next-episode`,
      { method: 'POST' }
    );
  }

  // Queue
  async getQueue(): Promise<QueueItem[]> {
    const res = await this.request<{ queue: QueueItem[] }>('/queue');
    return res.queue;
  }

  async scheduleVideo(videoId: string, scheduledTime: string): Promise<QueueItem> {
    const res = await this.request<{ queueItem: QueueItem }>('/queue', {
      method: 'POST',
      body: JSON.stringify({ videoId, scheduledTime }),
    });
    return res.queueItem;
  }

  async removeFromQueue(id: string): Promise<void> {
    await this.request(`/queue/${id}`, { method: 'DELETE' });
  }

  async retryQueueItem(id: string): Promise<void> {
    await this.request(`/queue/${id}/retry`, { method: 'POST' });
  }

  async processDueQueue(): Promise<{ processedCount: number; message: string }> {
    return this.request<{ processedCount: number; message: string }>('/queue/process-due', {
      method: 'POST',
    });
  }

  // Facebook
  async getFacebookStatus(): Promise<FacebookStatus> {
    const res = await this.request<{ facebook: FacebookStatus }>('/facebook/status');
    return res.facebook;
  }

  async fetchFacebookPages(userAccessToken: string): Promise<FacebookPageSummary[]> {
    const res = await this.request<{ pages: FacebookPageSummary[] }>('/facebook/fetch-pages', {
      method: 'POST',
      body: JSON.stringify({ userAccessToken }),
    });
    return res.pages;
  }

  async selectFacebookPage(pageId: string): Promise<{ message: string; facebook: FacebookStatus }> {
    return this.request<{ message: string; facebook: FacebookStatus }>('/facebook/select-page', {
      method: 'POST',
      body: JSON.stringify({ pageId }),
    });
  }

  async directConnectPage(pageId: string, pageAccessToken: string, pageName?: string): Promise<{ message: string; facebook: FacebookStatus }> {
    return this.request<{ message: string; facebook: FacebookStatus }>('/facebook/direct-connect', {
      method: 'POST',
      body: JSON.stringify({ pageId, pageAccessToken, pageName }),
    });
  }

  async verifyFacebookConnection(): Promise<{ valid: boolean; status: string; errorMessage?: string; facebook: FacebookStatus }> {
    return this.request<{ valid: boolean; status: string; errorMessage?: string; facebook: FacebookStatus }>('/facebook/verify', {
      method: 'POST',
    });
  }

  async disconnectFacebook(): Promise<{ message: string; facebook: FacebookStatus }> {
    return this.request<{ message: string; facebook: FacebookStatus }>('/facebook/disconnect', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();
