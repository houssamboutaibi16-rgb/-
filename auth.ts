import { Router, Response } from 'express';
import { db } from '../db.ts';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.ts';

const router = Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال الاسم، البريد الإلكتروني، وكلمة المرور' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'البريد الإلكتروني مسجل مسبقاً، يرجى تسجيل الدخول' });
    }

    const { salt, hash } = db.hashPassword(password);
    const user = db.createUser(name.trim(), email, hash, salt);
    const session = db.createSession(user.id);

    return res.status(201).json({
      token: session.token,
      user: db.getSafeUser(user),
      message: 'تم إنشاء الحساب بنجاح',
    });
  } catch (err: any) {
    return res.status(500).json({ error: `حدث خطأ أثناء التسجيل: ${err.message}` });
  }
});

// Login user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'الرجاء إدخال البريد الإلكتروني وكلمة المرور' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const valid = db.verifyPassword(password, user.salt, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }

    const session = db.createSession(user.id);
    db.addLog(user.id, 'auth', 'تسجيل دخول ناجح', `تم تسجيل الدخول إلى استوديو NovaPulse بنجاح`, 'success');

    return res.json({
      token: session.token,
      user: db.getSafeUser(user),
      message: 'مرحباً بك مجدداً!',
    });
  } catch (err: any) {
    return res.status(500).json({ error: `فشل تسجيل الدخول: ${err.message}` });
  }
});

// Logout user
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.token) {
    db.deleteSession(req.token);
  }
  return res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

// Get current authenticated user
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  return res.json({ user: db.getSafeUser(req.user) });
});

// Update profile and settings
router.put('/profile', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'غير مصرح' });

  try {
    const { name, settings } = req.body;
    const updates: any = {};

    if (name) updates.name = name.trim();
    if (settings) {
      updates.settings = {
        ...req.user.settings,
        ...settings,
      };
    }

    const updated = db.updateUser(req.user.id, updates);
    if (!updated) return res.status(404).json({ error: 'المستخدم غير موجود' });

    db.addLog(req.user.id, 'system', 'تحديث الإعدادات', 'تم حفظ إعدادات المستخدم بنجاح', 'info');

    return res.json({
      user: db.getSafeUser(updated),
      message: 'تم تحديث البيانات بنجاح',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
