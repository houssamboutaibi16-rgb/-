export interface FacebookPageInfo {
  id: string;
  name: string;
  category?: string;
  access_token: string;
  tasks?: string[];
  followersCount?: number;
}

export interface FacebookTokenCheckResult {
  valid: boolean;
  pageId?: string;
  pageName?: string;
  category?: string;
  followersCount?: number;
  status: 'connected' | 'expired' | 'needs_reconnect' | 'disconnected';
  errorMessage?: string;
}

const META_GRAPH_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export class FacebookService {
  /**
   * Generates the official Meta Facebook OAuth authorization dialog URL
   */
  static getOAuthDialogUrl(appId: string, redirectUri: string, state: string): string {
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'publish_video',
    ].join(',');

    return (
      `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?` +
      new URLSearchParams({
        client_id: appId,
        redirect_uri: redirectUri,
        state: state,
        scope: scopes,
        response_type: 'code',
      }).toString()
    );
  }

  /**
   * Exchanges authorization code for User Access Token
   */
  static async exchangeCodeForUserToken(
    appId: string,
    appSecret: string,
    redirectUri: string,
    code: string
  ): Promise<{ accessToken: string; expiresIn?: number }> {
    const url = `${GRAPH_API_BASE}/oauth/access_token?` +
      new URLSearchParams({
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code,
      }).toString();

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'فشل تبادل رمز التفويض مع فيسبوك');
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  /**
   * Fetches all Facebook Pages that the authorized user manages
   * GET /me/accounts?fields=id,name,category,access_token,tasks
   */
  static async fetchUserManagedPages(userAccessToken: string): Promise<FacebookPageInfo[]> {
    const url = `${GRAPH_API_BASE}/me/accounts?fields=id,name,category,access_token,tasks,followers_count&access_token=${encodeURIComponent(
      userAccessToken
    )}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok || data.error) {
      const msg = data.error?.message || 'تعذر جلب صفحات فيسبوك التابعة لهذا الحساب';
      throw new Error(msg);
    }

    const pages: any[] = data.data || [];
    return pages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      access_token: p.access_token,
      tasks: p.tasks || [],
      followersCount: p.followers_count,
    }));
  }

  /**
   * Verifies the validity of a Page Access Token with Meta Graph API
   */
  static async verifyPageToken(pageId: string, pageAccessToken: string): Promise<FacebookTokenCheckResult> {
    if (!pageId || !pageAccessToken) {
      return {
        valid: false,
        status: 'disconnected',
        errorMessage: 'لم يتم تزويد معرف الصفحة أو رمز الوصول',
      };
    }

    try {
      const url = `${GRAPH_API_BASE}/${pageId}?fields=id,name,category,followers_count,is_published&access_token=${encodeURIComponent(
        pageAccessToken
      )}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || data.error) {
        const code = data.error?.code;
        const subcode = data.error?.error_subcode;
        const msg = data.error?.message || 'فشل التحقق من صلاحية رمز الصفحة';

        // Code 190 typically represents expired or invalid access token
        if (code === 190) {
          return {
            valid: false,
            status: 'expired',
            errorMessage: 'انتهت صلاحية رمز الوصول لصفحة فيسبوك. يرجى إعادة الاتصال.',
          };
        }

        // Permission revoked or page deleted
        if (code === 200 || subcode === 460) {
          return {
            valid: false,
            status: 'needs_reconnect',
            errorMessage: 'تم سحب الصلاحيات أو تعديل الصفحة، يلزم إعادة المصادقة.',
          };
        }

        return {
          valid: false,
          status: 'needs_reconnect',
          errorMessage: msg,
        };
      }

      return {
        valid: true,
        pageId: data.id,
        pageName: data.name,
        category: data.category,
        followersCount: data.followers_count,
        status: 'connected',
      };
    } catch (err: any) {
      return {
        valid: false,
        status: 'needs_reconnect',
        errorMessage: `خطأ أثناء الاتصال بـ Meta Graph API: ${err.message}`,
      };
    }
  }

  /**
   * Publishes a video / reel directly to the specified Facebook Page
   * Uses POST /{page_id}/videos with title, description and direct video URL or file data
   */
  static async publishVideoToPage(
    pageId: string,
    pageAccessToken: string,
    params: {
      title: string;
      description: string;
      videoUrl?: string;
      scheduledPublishTime?: number; // UNIX timestamp
    }
  ): Promise<{ success: boolean; id?: string; postId?: string; error?: string }> {
    try {
      const endpoint = `${GRAPH_API_BASE}/${pageId}/videos`;

      const bodyData: Record<string, any> = {
        title: params.title,
        description: params.description,
        access_token: pageAccessToken,
      };

      if (params.videoUrl) {
        bodyData.file_url = params.videoUrl;
      }

      if (params.scheduledPublishTime) {
        bodyData.published = false;
        bodyData.scheduled_publish_time = params.scheduledPublishTime;
      } else {
        bodyData.published = true;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyData),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return {
          success: false,
          error: result.error?.message || 'فشل نشر الفيديو على صفحة فيسبوك',
        };
      }

      return {
        success: true,
        id: result.id,
        postId: result.post_id || result.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: `خطأ تقني أثناء محاولة النشر على فيسبوك: ${err.message}`,
      };
    }
  }
}
