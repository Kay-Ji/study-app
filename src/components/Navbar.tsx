import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Sparkles,
  CheckSquare,
  Bell,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  Globe,
  Plus,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatTimeInTz, formatDateInTz } from '../utils/time';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    allUsers,
    switchUser,
    logout,
    activeTab,
    setActiveTab,
    unreadNotificationCount,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    serverTime,
    setIsAddEventOpen,
    setIsAddTaskOpen,
    setIsAuthModalOpen,
    recommendations,
    tasks,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const pendingRecCount = recommendations.filter((r) => r.status === 'pending').length;
  const pendingTaskCount = tasks.filter((t) => t.status !== 'completed').length;

  // Localized string formats
  const localTimeStr = formatTimeInTz(serverTime.toISOString(), timezone, { second: '2-digit' });
  const localDateStr = formatDateInTz(serverTime.toISOString(), timezone);
  const utcTimeStr = serverTime.toISOString().substring(11, 19);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      {/* Top Banner: Real-Time Server Synchronization Bar */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5"></span>
              <span className="text-slate-200 font-semibold">Real-Time Backend Sync</span>
            </span>
            <span className="text-slate-500">|</span>
            <div className="flex items-center gap-1 font-mono text-slate-400">
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>Server UTC: <strong className="text-slate-200">{utcTimeStr}</strong></span>
            </div>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <div className="flex items-center gap-1 text-slate-300 hidden sm:flex">
              <span>Timezone: <strong className="text-indigo-300">{timezone}</strong></span>
              <span className="font-mono text-emerald-400 font-medium">({localTimeStr})</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="hidden md:inline">Ngày máy chủ: {localDateStr}</span>
            <button
              id="top-quick-add-task-btn"
              onClick={() => setIsAddTaskOpen(true)}
              className="px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 hover:bg-indigo-800 border border-indigo-700/50 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Việc mới</span>
            </button>
            <button
              id="top-quick-add-event-btn"
              onClick={() => setIsAddEventOpen(true)}
              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Lịch mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('home')}
            className="cursor-pointer flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">PlanAI</span>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">
                  Scheduler
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Tối ưu hóa lịch học & công việc bằng AI
              </p>
            </div>
          </div>
        </div>

        {/* Tab Links */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 text-sm font-medium">
          <button
            id="nav-tab-home"
            onClick={() => setActiveTab('home')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'home'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Tổng quan</span>
          </button>

          <button
            id="nav-tab-calendar"
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'calendar'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Lịch biểu</span>
          </button>

          <button
            id="nav-tab-tasks"
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'tasks'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Nhiệm vụ</span>
            {pendingTaskCount > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-slate-200 text-slate-700 font-bold">
                {pendingTaskCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-ai"
            onClick={() => setActiveTab('ai')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs font-semibold'
                : 'text-indigo-700 hover:bg-indigo-50 font-semibold'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Scheduler</span>
            {pendingRecCount > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-amber-400 text-slate-950 font-extrabold animate-pulse">
                {pendingRecCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-notifications"
            onClick={() => setActiveTab('notifications')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'notifications'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Thông báo</span>
            {unreadNotificationCount > 0 && (
              <span className="px-1.5 py-0.2 text-[11px] rounded-full bg-rose-500 text-white font-bold">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              activeTab === 'profile'
                ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Cài đặt</span>
          </button>
        </nav>

        {/* Right Actions: Notifications & User Profile */}
        <div className="flex items-center gap-2.5">
          {/* Notification Bell Dropdown */}
          <div className="relative">
            <button
              id="notification-bell-btn"
              onClick={() => setIsNotifMenuOpen(!isNotifMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
              title="Thông báo hệ thống"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            {isNotifMenuOpen && (
              <div
                id="notification-dropdown-menu"
                className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              >
                <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">Thông báo thời gian thực</span>
                    {unreadNotificationCount > 0 && (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-semibold rounded-full">
                        {unreadNotificationCount} mới
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Không có thông báo nào.
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          setActiveTab('notifications');
                          setIsNotifMenuOpen(false);
                        }}
                        className={`p-3 text-xs hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notif.read ? 'bg-indigo-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-slate-800 font-semibold">{notif.title}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {formatTimeInTz(notif.createdAt, timezone)}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                      </div>
                    ))
                  )}
                </div>

                <div className="px-4 pt-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setActiveTab('notifications');
                      setIsNotifMenuOpen(false);
                    }}
                    className="text-xs text-indigo-600 font-medium hover:underline"
                  >
                    Xem toàn bộ & Mô phỏng điện thoại →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Account Dropdown or Guest Login Button */}
          {currentUser ? (
            <div className="relative">
              <button
                id="user-profile-menu-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
              >
                <img
                  src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={currentUser.name || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
                />
                <div className="text-left hidden md:block">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-1">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{currentUser.email}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div
                  id="user-profile-dropdown"
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-1.5 inline-block px-2 py-0.5 rounded bg-slate-100 text-[10px] text-slate-600 font-mono">
                      {currentUser.timezone}
                    </div>
                  </div>

                  {/* Switch accounts */}
                  <div className="py-1">
                    <p className="px-4 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Chuyển tài khoản
                    </p>
                    {allUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id);
                          setIsUserMenuOpen(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          u.id === currentUser.id ? 'bg-indigo-50/70 text-indigo-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <div className="truncate font-medium">{u.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">{u.email}</div>
                        </div>
                        {u.id === currentUser.id && <span className="text-[10px] text-indigo-600 font-bold shrink-0">✓ Đang dùng</span>}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 pt-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setIsAuthModalOpen(true);
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-indigo-600 hover:bg-indigo-50 font-medium flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Đăng nhập / Đăng ký tài khoản khác</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('profile');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Cài đặt hồ sơ & Mật khẩu</span>
                    </button>
                    <button
                      id="navbar-logout-btn"
                      onClick={() => {
                        logout();
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 font-medium flex items-center gap-2 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              id="navbar-guest-login-btn"
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập / Đăng ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="lg:hidden border-t border-slate-200 bg-white px-2 py-1.5 flex items-center justify-around text-xs">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'home' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Tổng quan</span>
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'calendar' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Lịch</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'tasks' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Việc</span>
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'ai' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-[10px] mt-0.5">AI</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'notifications' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Báo giờ</span>
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center py-1 px-2 rounded-lg ${
            activeTab === 'profile' ? 'text-indigo-600 font-semibold' : 'text-slate-500'
          }`}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Hồ sơ</span>
        </button>
      </div>
    </header>
  );
};
