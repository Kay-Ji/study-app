import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User as UserIcon,
  Globe,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TIMEZONE_OPTIONS } from '../utils/time';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register, currentUser } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Register states
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [timezone, setTimezone] = useState('Asia/Ho_Chi_Minh');

  // Status & feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens/closes or mode switches, and when user logs out
  useEffect(() => {
    if (!isAuthModalOpen) {
      // Keep values but clear errors when closed? We clear errors.
      setError(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
    }
  }, [isAuthModalOpen]);

  // If user becomes logged in, close modal automatically (safety)
  useEffect(() => {
    if (currentUser && isAuthModalOpen) {
      // Modal will be closed by login/register functions, but ensure
      setError(null);
    }
  }, [currentUser, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleAppendGmail = (isReg: boolean) => {
    if (isReg) {
      const trimmed = regEmail.trim();
      if (trimmed && !trimmed.includes('@')) {
        setRegEmail(`${trimmed}@gmail.com`);
      }
    } else {
      const trimmed = loginEmail.trim();
      if (trimmed && !trimmed.includes('@')) {
        setLoginEmail(`${trimmed}@gmail.com`);
      }
    }
  };

  const handleQuickFill = (email: string, password: string = 'password123') => {
    setLoginEmail(email);
    setLoginPassword(password);
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const emailTrim = loginEmail.trim();
    if (!emailTrim) {
      setError('Vui lòng nhập tên đăng nhập (Gmail).');
      return;
    }
    if (!emailRegex.test(emailTrim.toLowerCase())) {
      setError('Email không đúng định dạng. Vui lòng nhập dạng user@gmail.com hoặc click \"+ Thêm @gmail.com\".');
      return;
    }
    if (!loginPassword) {
      setError('Vui lòng nhập mật khẩu tài khoản.');
      return;
    }
    if (loginPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsSubmitting(true);
    const result = await login(emailTrim, loginPassword);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại Gmail hoặc mật khẩu.');
    } else {
      // Clear fields on success
      setLoginEmail('');
      setLoginPassword('');
      setSuccessMsg('Đăng nhập thành công!');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const nameTrim = regName.trim();
    const emailTrim = regEmail.trim();

    if (!nameTrim) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (nameTrim.length < 2) {
      setError('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }
    if (!emailTrim) {
      setError('Vui lòng nhập tên đăng nhập (Gmail).');
      return;
    }
    if (!emailRegex.test(emailTrim.toLowerCase())) {
      setError('Tên đăng nhập phải là một địa chỉ Gmail hoặc Email hợp lệ (VD: user@gmail.com). Nếu bạn chỉ nhập username, hãy bấm \"+ Thêm @gmail.com\".');
      return;
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu bảo mật phải có ít nhất 6 ký tự.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setIsSubmitting(true);
    const result = await register(nameTrim, emailTrim, regPassword, timezone);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || 'Đăng ký không thành công. Email này có thể đã được sử dụng.');
    } else {
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      setSuccessMsg('Đăng ký thành công! Đang đăng nhập...');
    }
  };

  // Password strength helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, text: '', color: '' };
    if (pwd.length < 6) return { score: 1, text: 'Yếu (ít hơn 6 ký tự)', color: 'bg-rose-500 text-rose-600' };
    const hasLetters = /[a-zA-Z]/.test(pwd);
    const hasNumbers = /[0-9]/.test(pwd);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pwd);

    if (hasLetters && hasNumbers && hasSpecial && pwd.length >= 8) {
      return { score: 3, text: 'Rất mạnh', color: 'bg-emerald-500 text-emerald-600' };
    }
    if (hasLetters && hasNumbers) {
      return { score: 2, text: 'Khá an toàn', color: 'bg-amber-500 text-amber-600' };
    }
    return { score: 1, text: 'Trung bình', color: 'bg-indigo-500 text-indigo-600' };
  };

  const regPwdStrength = getPasswordStrength(regPassword);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              {mode === 'login' ? <LogIn className="w-5 h-5 text-indigo-600" /> : <UserPlus className="w-5 h-5 text-indigo-600" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 leading-tight">
                {mode === 'login' ? 'Đăng nhập hệ thống' : 'Tạo tài khoản người dùng'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {mode === 'login' ? 'Nhập Gmail và mật khẩu để tiếp tục' : 'Đăng ký tên đăng nhập (Gmail) & mật khẩu riêng'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-semibold">
          <button
            type="button"
            id="tab-auth-login"
            onClick={() => {
              setMode('login');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'login'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng nhập</span>
          </button>
          <button
            type="button"
            id="tab-auth-register"
            onClick={() => {
              setMode('register');
              setError(null);
              setSuccessMsg(null);
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'register'
                ? 'bg-white text-indigo-700 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng ký mới</span>
          </button>
        </div>

        {/* Error or Success notification */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-2xl flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} noValidate className="space-y-4 text-xs">
            {/* Username / Gmail Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tên đăng nhập (Gmail):</span>
                </label>
                {loginEmail && !loginEmail.includes('@') && (
                  <button
                    type="button"
                    onClick={() => handleAppendGmail(false)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                  >
                    + Thêm @gmail.com
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  id="login-input-email"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="VD: nguyenvana@gmail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-900"
                />
                <span className="absolute right-3 top-3 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mật khẩu:</span>
                </label>
                <span className="text-[10px] text-slate-400">Tối thiểu 6 ký tự</span>
              </div>
              <div className="relative">
                <input
                  id="login-input-password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="Nhập mật khẩu của bạn..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                  title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang xác thực...' : 'Đăng nhập'}</span>
            </button>

            {/* Quick Demo Credentials Helper */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-indigo-600" />
                  <span>Tài khoản mẫu thử nghiệm (Mật khẩu: password123):</span>
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('nguyenvana@gmail.com', 'password123')}
                  className="p-2 rounded-xl text-left border border-slate-200 bg-white hover:bg-indigo-50/60 hover:border-indigo-200 transition-all text-[11px]"
                >
                  <div className="font-bold text-slate-800">Nguyễn Văn A</div>
                  <div className="text-[10px] text-slate-500 truncate">nguyenvana@gmail.com</div>
                  <div className="text-[9px] text-indigo-600 font-medium mt-0.5">Click để điền nhanh →</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('son.le@gmail.com', 'password123')}
                  className="p-2 rounded-xl text-left border border-slate-200 bg-white hover:bg-indigo-50/60 hover:border-indigo-200 transition-all text-[11px]"
                >
                  <div className="font-bold text-slate-800">Lê Minh Sơn</div>
                  <div className="text-[10px] text-slate-500 truncate">son.le@gmail.com</div>
                  <div className="text-[9px] text-indigo-600 font-medium mt-0.5">Click để điền nhanh →</div>
                </button>
              </div>
            </div>

            {/* Switch to register text */}
            <div className="text-center pt-1 text-slate-500 text-xs">
              Chưa có tài khoản riêng?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                Đăng ký tài khoản mới
              </button>
            </div>
          </form>
        ) : (
          /* REGISTER FORM */
          <form onSubmit={handleRegister} noValidate className="space-y-3.5 text-xs">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                <span>Họ và tên người dùng:</span>
              </label>
              <input
                id="reg-input-name"
                type="text"
                autoComplete="name"
                required
                placeholder="VD: Trần Văn Nam"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-900"
              />
            </div>

            {/* Username / Gmail */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tên đăng nhập (Gmail):</span>
                </label>
                {regEmail && !regEmail.includes('@') && (
                  <button
                    type="button"
                    onClick={() => handleAppendGmail(true)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 px-1.5 py-0.5 rounded transition-colors"
                  >
                    + Thêm @gmail.com
                  </button>
                )}
              </div>
              <input
                id="reg-input-email"
                type="text"
                inputMode="email"
                autoComplete="email"
                required
                placeholder="VD: nam.tran@gmail.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-900"
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Mật khẩu:</span>
                </label>
                {regPassword && (
                  <span className={`text-[10px] font-semibold ${regPwdStrength.color.split(' ')[1]}`}>
                    {regPwdStrength.text}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="reg-input-password"
                  type={showRegPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Tối thiểu 6 ký tự..."
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full pl-3 pr-10 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Xác nhận mật khẩu:</span>
                </label>
                {regConfirmPassword && (
                  <span className="text-[10px] font-semibold">
                    {regPassword === regConfirmPassword ? (
                      <span className="text-emerald-600 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3 inline" /> Khớp mật khẩu
                      </span>
                    ) : (
                      <span className="text-rose-600">Chưa khớp</span>
                    )}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="reg-input-confirm-password"
                  type={showRegConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Nhập lại mật khẩu..."
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className={`w-full pl-3 pr-10 py-2 rounded-xl border bg-slate-50 focus:bg-white focus:ring-2 transition-all font-medium text-slate-900 ${
                    regConfirmPassword && regPassword !== regConfirmPassword
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100'
                      : 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-2.5 top-2 p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                >
                  {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <span>Múi giờ làm việc & học tập:</span>
              </label>
              <select
                id="reg-select-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-800"
              >
                {TIMEZONE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <button
              id="reg-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & Đăng nhập ngay'}</span>
            </button>

            {/* Switch to login text */}
            <div className="text-center pt-1 text-slate-500 text-xs">
              Đã có tài khoản?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
              >
                Đăng nhập tại đây
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
