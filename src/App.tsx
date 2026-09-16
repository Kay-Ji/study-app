import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { CalendarView } from './components/CalendarView';
import { TasksView } from './components/TasksView';
import { AISchedulerView } from './components/AISchedulerView';
import { NotificationCenterView } from './components/NotificationCenterView';
import { ProfileView } from './components/ProfileView';
import { AddEventModal } from './components/AddEventModal';
import { AddTaskModal } from './components/AddTaskModal';
import { AuthModal } from './components/AuthModal';
import { MobileNotificationToast } from './components/MobileNotificationToast';
import { InstallAppBanner } from './components/InstallAppBanner';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, isLoading, currentUser, setIsAuthModalOpen } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Floating Simulated Phone Notification Banner */}
      <MobileNotificationToast />

      {/* Gợi ý cài app PWA lên màn hình chính điện thoại */}
      <InstallAppBanner />

      {/* Persistent Navigation Header */}
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">
              Đang đồng bộ dữ liệu với máy chủ UTC...
            </p>
          </div>
        ) : !currentUser ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 text-center px-4 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-extrabold text-xl">AI</span>
            </div>
            <div className="space-y-2 max-w-md">
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Chào mừng đến với PlanAI Scheduler</h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Vui lòng đăng nhập hoặc đăng ký tài khoản mới để bắt đầu quản lý thời gian biểu, deadline và tối ưu lịch học bằng AI.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md transition-colors"
              >
                Đăng nhập / Đăng ký ngay
              </button>
            </div>
            <p className="text-[11px] text-slate-400 max-w-sm">
              Tài khoản mẫu: <strong>nguyenvana@gmail.com</strong> / <strong>password123</strong> hoặc <strong>son.le@gmail.com</strong> / <strong>password123</strong>
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'calendar' && <CalendarView />}
            {activeTab === 'tasks' && <TasksView />}
            {activeTab === 'ai' && <AISchedulerView />}
            {activeTab === 'notifications' && <NotificationCenterView />}
            {activeTab === 'profile' && <ProfileView />}
          </>
        )}
      </main>

      {/* Modals */}
      <AddEventModal />
      <AddTaskModal />
      <AuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
