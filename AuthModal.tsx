import React, { useState } from 'react';
import { User, Lock, Mail, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('يرجى إدخال اسمك');
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'فشلت المصادقة');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (userIndex = 1) => {
    if (userIndex === 1) {
      setEmail('creator@novapulse.ai');
      setPassword('password123');
      setName('أحمد المنصوري');
    } else {
      setEmail('studio2@novapulse.ai');
      setPassword('password123');
      setName('سارة العلمي');
    }
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 text-slate-400 hover:text-white text-lg p-1"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-cyan-500/25">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black text-white">
            {isRegister ? 'إنشاء حساب جديد في NovaPulse' : 'تسجيل الدخول إلى حسابك'}
          </h2>
          <p className="text-xs text-slate-400">
            {isRegister
              ? 'احصل على لوحة تحكم مستقلة وربط صفحة فيسبوك خاصة بك'
              : 'مرحباً بك مجدداً في استوديو إنتاج الفيديوهات بالذكاء الاصطناعي'}
          </p>
        </div>

        {/* Tabs toggle */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              !isRegister ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMessage(null);
            }}
            className={`flex-1 py-2 rounded-lg transition ${
              isRegister ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <div>
              <label className="block text-slate-300 font-semibold mb-1">الاسم الكامل *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="محمد المغربي"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white pr-9 focus:outline-none focus:border-cyan-500"
                />
                <User className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">البريد الإلكتروني *</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white pr-9 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">كلمة المرور *</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white pr-9 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute top-3 right-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-500/25 transition disabled:opacity-50 cursor-pointer"
          >
            {loading
              ? 'جاري المعالجة...'
              : isRegister
              ? 'إنشاء الحساب وبدء الاستخدام'
              : 'تسجيل الدخول'}
          </button>
        </form>

        {/* Quick Demo Credentials Helper */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-center">
          <span className="text-[11px] text-slate-500">لتجربة تعدد المستخدمين فوراً:</span>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => handleFillDemo(1)}
              className="text-[11px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 transition"
            >
              مستخدم 1 (أحمد)
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo(2)}
              className="text-[11px] px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 transition"
            >
              مستخدم 2 (سارة)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
