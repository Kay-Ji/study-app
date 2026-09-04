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
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { activeTab, isLoading } = useApp();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Floating Simulated Phone Notification Banner */}
      <MobileNotificationToast />

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
