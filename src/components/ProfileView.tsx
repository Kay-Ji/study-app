import React, { useState } from 'react';
import {
  User,
  Globe,
  Sliders,
  Clock,
  RotateCcw,
  Save,
  CheckCircle2,
  Shield,
  Sparkles,
  Lock,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TIMEZONE_OPTIONS, formatTimeInTz } from '../utils/time';

export const ProfileView: React.FC = () => {
  const {
    currentUser,
    preferences,
    updateProfile,
    updatePreferences,
    serverTime,
    resetDefaultData,
    isLoading,
    offlineMode,
    modePreference,
    setModePreference,
  } = useApp();

  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [timezone, setTimezone] = useState(currentUser?.timezone || 'Asia/Ho_Chi_Minh');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Change password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isUpdatingPwd, setIsUpdatingPwd] = useState(false);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setEmail(currentUser.email);
      setTimezone(currentUser.timezone);
      setAvatar(currentUser.avatar || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ name, email, timezone, avatar });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdFeedback(null);

    if (newPassword.length < 6) {
      setPwdFeedback({ type: 'error', text: 'Mật khẩu mới phải có tối thiểu 6 ký tự.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdFeedback({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setIsUpdatingPwd(true);
    try {
      await updateProfile({ password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setPwdFeedback({ type: 'success', text: 'Cập nhật mật khẩu mới thành công!' });
      setTimeout(() => setPwdFeedback(null), 4000);
    } catch (err: any) {
      setPwdFeedback({ type: 'error', text: err.message || 'Lỗi khi cập nhật mật khẩu.' });
    } finally {
      setIsUpdatingPwd(false);
    }
  };

  const selectedTzTime = formatTimeInTz(serverTime.toISOString(), timezone, { second: '2-digit' });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hồ sơ & Cài đặt Cá nhân</h2>
            <p className="text-xs text-slate-500 font-medium">
              Quản lý múi giờ, thói quen học tập và đồng bộ hóa tài khoản
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile Form & Timezone */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Thông tin Người dùng</h3>
              {savedSuccess && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  Đã lưu thay đổi!
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover ring-4 ring-indigo-50"
              />
              <div className="flex-1 w-full space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Đường dẫn ảnh đại diện (Avatar URL):</label>
                <input
                  type="url"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full p-2 text-xs rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Họ và tên:</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  required
                />
              </div>
            </div>

            {/* Timezone Setting */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Múi giờ làm việc (User Timezone):
                </label>
                <span className="text-xs text-indigo-600 font-mono font-bold">
                  Giờ địa phương hiện tại: {selectedTzTime}
                </span>
              </div>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800"
              >
                {TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Toàn bộ lịch biểu và nhắc giờ sẽ tự động quy đổi chính xác từ chuẩn UTC sang múi giờ này.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thông tin cá nhân</span>
              </button>
            </div>
          </form>

          {/* Change Password Card */}
          <form onSubmit={handleChangePassword} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">Bảo mật & Đổi Mật khẩu</h3>
              </div>
              {pwdFeedback && (
                <span
                  className={`text-xs font-semibold flex items-center gap-1 animate-in fade-in ${
                    pwdFeedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                  }`}
                >
                  {pwdFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {pwdFeedback.text}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">Mật khẩu mới:</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    required
                    className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">Xác nhận mật khẩu mới:</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPwd || !newPassword}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isUpdatingPwd ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}</span>
              </button>
            </div>
          </form>

          {/* Standalone / Offline mode switch */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Smartphone className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900">Chế độ điện thoại độc lập</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ở chế độ <strong>Offline</strong>, toàn bộ dữ liệu (tài khoản, lịch, công việc, đề xuất AI)
              được lưu ngay trên thiết bị — app chạy độc lập hoàn toàn, kể cả khi mất mạng hoặc máy chủ
              không khả dụng. Cài app lên màn hình chính điện thoại để có trải nghiệm như app native.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {([
                { key: 'auto', label: 'Tự động', desc: 'Dò máy chủ khi mở app', icon: RefreshCw },
                { key: 'online', label: 'Online', desc: 'Luôn dùng máy chủ', icon: Wifi },
                { key: 'offline', label: 'Offline', desc: 'Lưu trên máy', icon: WifiOff },
              ] as const).map(({ key, label, desc, icon: Icon }) => {
                const active = modePreference === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setModePreference(key)}
                    className={`flex flex-col items-center gap-1 px-2 py-3 rounded-2xl border text-center transition-all ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold ${active ? 'text-indigo-700' : 'text-slate-600'}`}>{label}</span>
                    <span className="text-[10px] text-slate-400 leading-tight">{desc}</span>
                  </button>
                );
              })}
            </div>
            <div
              className={`text-[11px] font-semibold px-3 py-2 rounded-xl ${
                offlineMode
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-sky-50 text-sky-700 border border-sky-200'
              }`}
            >
              {offlineMode
                ? '📱 Đang chạy ĐỘC LẬP (offline) — dữ liệu nằm trong bộ nhớ của thiết bị này.'
                : '☁️ Đang kết nối máy chủ — dữ liệu đồng bộ qua backend.'}
            </div>
          </div>

          {/* Database Reset / Seeding */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900">Dữ liệu thử nghiệm (Seed Data)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn có thể đặt lại dữ liệu mẫu về trạng thái ban đầu (bao gồm các môn học cố định như Lập trình Python, AI, Cơ sở dữ liệu và các deadline mẫu).
            </p>
            <button
              id="reset-demo-data-btn"
              onClick={resetDefaultData}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>Khôi phục dữ liệu mẫu ban đầu</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Study Preferences summary & Specs */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Sliders className="w-4 h-4" />
              <h3 className="font-bold text-sm text-slate-900">Cấu hình Tối ưu AI</h3>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100">
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Khung giờ vàng:</span>
                <span className="font-bold text-slate-800">
                  {preferences?.preferredStartTime} - {preferences?.preferredEndTime}
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Thời lượng 1 ca:</span>
                <span className="font-bold text-slate-800">
                  {preferences?.sessionDurationHours} giờ
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Giới hạn học/ngày:</span>
                <span className="font-bold text-slate-800">
                  {preferences?.dailyMaxStudyHours} giờ
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Thời gian giải lao:</span>
                <span className="font-bold text-slate-800">
                  {preferences?.breakDurationMinutes} phút
                </span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-500">Nhắc trước:</span>
                <span className="font-bold text-indigo-600">
                  {preferences?.reminderAdvanceMinutes} phút
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900 text-indigo-100 rounded-3xl p-6 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Shield className="w-4 h-4" />
              <span>TIÊU CHUẨN THIẾT KẾ ĐỀ TÀI</span>
            </div>
            <ul className="space-y-2 text-indigo-200/90 leading-relaxed list-disc list-inside">
              <li>Lưu trữ thời gian toàn cầu chuẩn ISO UTC</li>
              <li>Tự động thích ứng đa múi giờ (Timezone-Aware)</li>
              <li>Chống xếp đè lên lịch học cố định của trường</li>
              <li>AI đóng vai trò Trợ lý đề xuất (Human-in-the-loop)</li>
              <li>Mô phỏng thông báo đẩy trên thiết bị di động</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
