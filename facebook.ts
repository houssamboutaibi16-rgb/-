import { Router, Response } from 'express';
import { db } from '../db.ts';
import { FacebookService } from '../facebook.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Get Facebook connection status for current user
router.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });
  const safe = db.getSafeUser(req.user);
  return res.json({ facebook: safe.facebook });
});

// Fetch pages using User Access Token (from Meta OAuth or Token Input)
router.post('/fetch-pages', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { userAccessToken } = req.body;

    if (!userAccessToken || typeof userAccessToken !== 'string') {
      return res.status(400).json({ error: 'يرجى تقديم رمز وصول المستخدم (User Access Token) من فيسبوك' });
    }

    const pages = await FacebookService.fetchUserManagedPages(userAccessToken.trim());

    if (!pages || pages.length === 0) {
      return res.status(404).json({
        error: 'لم يتم العثور على أي صفحات فيسبوك تملك صلاحيات إدارتها في هذا الحساب. تأكد من منح صلاحية pages_show_list.',
      });
    }

    // Save available pages securely on this user's record
    const updated = db.updateUser(req.user.id, {
      facebook: {
        ...req.user.facebook,
        userAccessToken: userAccessToken.trim(),
        availablePages: pages,
        lastChecked: new Date().toISOString(),
      },
    });

    db.addLog(
      req.user.id,
      'facebook_publish',
      'جلب صفحات فيسبوك',
      `تم العثور على ${pages.length} صفحة فيسبوك متاحة للربط`,
      'info'
    );

    return res.json({
      success: true,
      pages: pages.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        tasks: p.tasks,
        followersCount: p.followersCount,
      })),
    });
  } catch (err: any) {
    db.addLog(req.user.id, 'error', 'فشل جلب صفحات فيسبوك', err.message, 'error');
    return res.status(400).json({ error: err.message });
  }
});

// Select active page from available pages
router.post('/select-page', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { pageId } = req.body;
    if (!pageId) {
      return res.status(400).json({ error: 'يرجى تحديد معرف الصفحة المراد ربطها' });
    }

    const available = req.user.facebook.availablePages || [];
    const selectedPage = available.find((p) => p.id === pageId);

    if (!selectedPage) {
      return res.status(404).json({
        error: 'الصفحة المحددة غير موجودة ضمن قائمة الصفحات المتاحة لحسابك',
      });
    }

    // Test page token with Graph API
    const check = await FacebookService.verifyPageToken(selectedPage.id, selectedPage.access_token);

    if (!check.valid) {
      db.updateUser(req.user.id, {
        facebook: {
          ...req.user.facebook,
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.access_token,
          connected: false,
          status: check.status,
          lastError: check.errorMessage,
          lastChecked: new Date().toISOString(),
        },
      });

      db.addLog(
        req.user.id,
        'error',
        'فشل التحقق من صفحة فيسبوك',
        check.errorMessage || 'الرمز غير صالح',
        'error'
      );

      return res.status(400).json({
        error: check.errorMessage || 'فشل التحقق من رمز الصفحة مع Meta Graph API',
        status: check.status,
      });
    }

    // Successfully connected!
    const updated = db.updateUser(req.user.id, {
      facebook: {
        ...req.user.facebook,
        connected: true,
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        category: selectedPage.category,
        pageAccessToken: selectedPage.access_token,
        status: 'connected',
        lastChecked: new Date().toISOString(),
        followersCount: check.followersCount,
        lastError: undefined,
      },
    });

    db.addLog(
      req.user.id,
      'facebook_publish',
      'ربط صفحة فيسبوك بنجاح',
      `تم ربط الصفحة "${selectedPage.name}" (ID: ${selectedPage.id}) بنجاح`,
      'success'
    );

    return res.json({
      success: true,
      message: `تم ربط الصفحة "${selectedPage.name}" بنجاح!`,
      facebook: db.getSafeUser(updated!).facebook,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Direct Page Connect (for direct Page ID & Page Access Token)
router.post('/direct-connect', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { pageId, pageAccessToken, pageName } = req.body;

    if (!pageId || !pageAccessToken) {
      return res.status(400).json({ error: 'يرجى إدخال معرف الصفحة (Page ID) ورمز وصول الصفحة (Page Access Token)' });
    }

    // Verify directly with Meta Graph API
    const check = await FacebookService.verifyPageToken(pageId.trim(), pageAccessToken.trim());

    if (!check.valid) {
      db.updateUser(req.user.id, {
        facebook: {
          ...req.user.facebook,
          connected: false,
          pageId: pageId.trim(),
          pageName: pageName || check.pageName || 'صفحة فيسبوك',
          pageAccessToken: pageAccessToken.trim(),
          status: check.status,
          lastError: check.errorMessage,
          lastChecked: new Date().toISOString(),
        },
      });

      return res.status(400).json({
        error: check.errorMessage || 'فشل التحقق من رمز الصفحة مع Meta Graph API',
        status: check.status,
      });
    }

    const updated = db.updateUser(req.user.id, {
      facebook: {
        ...req.user.facebook,
        connected: true,
        pageId: check.pageId || pageId.trim(),
        pageName: check.pageName || pageName || 'صفحة فيسبوك',
        category: check.category,
        followersCount: check.followersCount,
        pageAccessToken: pageAccessToken.trim(),
        status: 'connected',
        lastChecked: new Date().toISOString(),
        lastError: undefined,
      },
    });

    db.addLog(
      req.user.id,
      'facebook_publish',
      'ربط صفحة فيسبوك عبر الرمز المباشر',
      `تم التحقق من الصفحة "${check.pageName || pageId}" وربطها بنجاح`,
      'success'
    );

    return res.json({
      success: true,
      message: `تم ربط الصفحة "${check.pageName || pageId}" بنجاح!`,
      facebook: db.getSafeUser(updated!).facebook,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Verify connection validity live
router.post('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const fb = req.user.facebook;
  if (!fb.pageId || !fb.pageAccessToken) {
    return res.json({
      valid: false,
      status: 'disconnected',
      message: 'لا توجد صفحة فيسبوك مربوطة حالياً',
    });
  }

  const check = await FacebookService.verifyPageToken(fb.pageId, fb.pageAccessToken);

  const updated = db.updateUser(req.user.id, {
    facebook: {
      ...fb,
      status: check.status,
      lastChecked: new Date().toISOString(),
      followersCount: check.followersCount || fb.followersCount,
      lastError: check.errorMessage,
      connected: check.valid,
    },
  });

  return res.json({
    valid: check.valid,
    status: check.status,
    errorMessage: check.errorMessage,
    facebook: db.getSafeUser(updated!).facebook,
  });
});

// Disconnect active page
router.post('/disconnect', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  const oldPageName = req.user.facebook.pageName;
  const updated = db.updateUser(req.user.id, {
    facebook: {
      connected: false,
      status: 'disconnected',
      pageId: undefined,
      pageName: undefined,
      pageAccessToken: undefined,
      userAccessToken: undefined,
      availablePages: [],
      lastChecked: new Date().toISOString(),
      lastError: undefined,
    },
  });

  db.addLog(
    req.user.id,
    'facebook_publish',
    'فصل صفحة فيسبوك',
    `تم فصل الصفحة "${oldPageName || 'السابقة'}" بنجاح`,
    'info'
  );

  return res.json({
    success: true,
    message: 'تم فصل صفحة فيسبوك بنجاح',
    facebook: db.getSafeUser(updated!).facebook,
  });
});

// OAuth Dialog URL helper
router.get('/oauth-url', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return res.status(400).json({
      error: 'لم يتم تعيين META_APP_ID في متغيرات الخادم. يمكنك استخدام خيار الربط المباشر برمز الوصول.',
    });
  }

  const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/facebook-callback`;
  const state = req.user?.id || 'novapulse_user';
  const url = FacebookService.getOAuthDialogUrl(appId, redirectUri, state);

  return res.json({ url });
});

export default router;
