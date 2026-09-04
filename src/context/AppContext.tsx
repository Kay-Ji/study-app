import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  User,
  ScheduleEvent,
  TaskItem,
  UserPreferences,
  AIRecommendation,
  AppNotification,
  ServerTimeResponse,
} from '../types';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  preferences: UserPreferences | null;
  events: ScheduleEvent[];
  tasks: TaskItem[];
  recommendations: AIRecommendation[];
  notifications: AppNotification[];
  unreadNotificationCount: number;
  serverTime: Date;
  activeTab: 'home' | 'calendar' | 'tasks' | 'ai' | 'notifications' | 'profile';
  setActiveTab: (tab: 'home' | 'calendar' | 'tasks' | 'ai' | 'notifications' | 'profile') => void;
  isLoading: boolean;
  isGeneratingAI: boolean;
  isAddEventOpen: boolean;
  setIsAddEventOpen: (open: boolean) => void;
  isAddTaskOpen: boolean;
  setIsAddTaskOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  activeToast: AppNotification | null;
  dismissToast: () => void;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string, timezone: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  switchUser: (userId: string) => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  createEvent: (data: Partial<ScheduleEvent>) => Promise<boolean>;
  updateEvent: (id: string, data: Partial<ScheduleEvent>) => Promise<boolean>;
  deleteEvent: (id: string) => Promise<boolean>;
  createTask: (data: Partial<TaskItem>) => Promise<boolean>;
  updateTask: (id: string, data: Partial<TaskItem>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  runAIScheduler: () => Promise<{ success: boolean; message: string }>;
  applyRecommendation: (recId: string) => Promise<boolean>;
  rejectRecommendation: (recId: string) => Promise<boolean>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  triggerTestNotification: (title?: string, message?: string) => Promise<void>;
  resetDefaultData: () => Promise<void>;
  refreshAllData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'calendar' | 'tasks' | 'ai' | 'notifications' | 'profile'>('home');
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<AppNotification | null>(null);

  // Server Time Tracking (UTC reference synchronized with backend)
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState<number>(0);
  const [serverTime, setServerTime] = useState<Date>(new Date());

  // Synchronize server time
  const syncServerTime = useCallback(async () => {
    try {
      const clientReqTime = Date.now();
      const res = await fetch('/api/time');
      if (res.ok) {
        const data: ServerTimeResponse = await res.json();
        const clientResTime = Date.now();
        const networkLatency = (clientResTime - clientReqTime) / 2;
        const estimatedServerNow = data.timestamp + networkLatency;
        setServerTimeOffsetMs(estimatedServerNow - clientResTime);
        setServerTime(new Date(estimatedServerNow));
      }
    } catch (err) {
      console.warn('Could not sync server time:', err);
    }
  }, []);

  // Update server clock every second
  useEffect(() => {
    syncServerTime();
    const clockInterval = setInterval(() => {
      setServerTime(new Date(Date.now() + serverTimeOffsetMs));
    }, 1000);

    // Sync with backend every 60 seconds
    const syncInterval = setInterval(syncServerTime, 60000);

    return () => {
      clearInterval(clockInterval);
      clearInterval(syncInterval);
    };
  }, [syncServerTime, serverTimeOffsetMs]);

  // Load initial data. If no user is known yet we only fetch the user list to
  // resolve the active account; user-scoped resources are fetched only after
  // currentUser is set. This prevents briefly showing another user's data.
  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Always refresh the user directory first (cheap, unauthenticated list).
      const usersRes = await fetch('/api/users');
      let resolvedUser = currentUser;
      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        setAllUsers(users);
        if (!resolvedUser && users.length > 0) {
          const savedUserId = localStorage.getItem('planai_userId');
          resolvedUser = users.find((u) => u.id === savedUserId) || users[0];
          setCurrentUser(resolvedUser);
        }
      }

      // If we still don't have a user, skip user-scoped fetches entirely.
      if (!resolvedUser) {
        setEvents([]);
        setTasks([]);
        setRecommendations([]);
        setNotifications([]);
        setIsLoading(false);
        return;
      }

      const uid = resolvedUser.id;
      const [eventsRes, tasksRes, recsRes, notifsRes, prefRes] = await Promise.all([
        fetch(`/api/events?userId=${uid}`),
        fetch(`/api/tasks?userId=${uid}`),
        fetch(`/api/ai/recommendations?userId=${uid}`),
        fetch(`/api/notifications?userId=${uid}`),
        preferences ? Promise.resolve(null) : fetch(`/api/users/${uid}/preferences`),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      if (recsRes.ok) setRecommendations(await recsRes.json());
      if (notifsRes.ok) setNotifications(await notifsRes.json());
      if (prefRes && prefRes.ok) setPreferences(await prefRes.json());
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, preferences]);

  useEffect(() => {
    refreshAllData();
  }, [currentUser?.id]);

  // Real-time Reminder Checker:
  // Inspects upcoming events and triggers notifications when approaching reminder window
  useEffect(() => {
    if (!currentUser || events.length === 0) return;

    const checkReminders = () => {
      const now = serverTime.getTime();
      const advanceMinutes = preferences?.reminderAdvanceMinutes || 15;
      const advanceMs = advanceMinutes * 60000;

      for (const event of events) {
        const startTime = new Date(event.startTime).getTime();
        const timeDiff = startTime - now;

        // If event is within the advance reminder window (e.g. within 15 mins and not past 2 mins)
        if (timeDiff > 0 && timeDiff <= advanceMs) {
          const alreadyNotified = notifications.some(
            (n) => n.eventId === event.id && Math.abs(new Date(n.createdAt).getTime() - now) < 600000
          );

          if (!alreadyNotified) {
            const minutesLeft = Math.ceil(timeDiff / 60000);
            const newNotif: AppNotification = {
              id: `notif_rt_${Date.now()}`,
              userId: currentUser.id,
              title: '🔔 Sắp đến giờ ' + (event.type === 'class' ? 'học' : 'công việc'),
              message: `Bạn có lịch '${event.title}' ${event.location ? `tại ${event.location}` : ''}. Còn ${minutesLeft} phút.`,
              eventId: event.id,
              scheduledFor: new Date().toISOString(),
              advanceMinutes: advanceMinutes,
              read: false,
              createdAt: new Date().toISOString(),
              type: 'reminder',
            };

            setNotifications((prev) => [newNotif, ...prev]);
            setActiveToast(newNotif);
            break;
          }
        }
      }
    };

    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [events, serverTime, preferences, currentUser, notifications]);

  // Switch User
  const switchUser = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('planai_userId', user.id);
      const prefRes = await fetch(`/api/users/${user.id}/preferences`);
      if (prefRes.ok) {
        setPreferences(await prefRes.json());
      }
    }
  };

  // Login with Username/Gmail & Password
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setPreferences(data.preferences);
        localStorage.setItem('planai_userId', data.user.id);
        setIsAuthModalOpen(false);
        refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Đăng nhập không thành công.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  // Register with Name, Username/Gmail, Password & Timezone
  const register = async (
    name: string,
    email: string,
    password: string,
    timezone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, timezone }),
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        setPreferences(data.preferences);
        setAllUsers((prev) => [...prev, data.user]);
        localStorage.setItem('planai_userId', data.user.id);
        setIsAuthModalOpen(false);
        refreshAllData();
        return { success: true };
      }
      return { success: false, error: data.error || 'Đăng ký không thành công.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('planai_userId');
    setCurrentUser(null);
    setPreferences(null);
  };

  // Update Profile
  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated);
        setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  // Update Preferences
  const updatePreferences = async (data: Partial<UserPreferences>) => {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/users/${currentUser.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setPreferences(updated);
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  // Event CRUD
  const createEvent = async (data: Partial<ScheduleEvent>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: currentUser.id }),
      });
      if (res.ok) {
        const newEvt = await res.json();
        setEvents((prev) => [...prev, newEvt]);
        refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateEvent = async (id: string, data: Partial<ScheduleEvent>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteEvent = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Task CRUD
  const createTask = async (data: Partial<TaskItem>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: currentUser.id }),
      });
      if (res.ok) {
        const newTask = await res.json();
        setTasks((prev) => [...prev, newTask]);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const updateTask = async (id: string, data: Partial<TaskItem>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // AI Scheduler Optimizer
  const runAIScheduler = async (): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Chưa đăng nhập' };
    try {
      setIsGeneratingAI(true);
      const res = await fetch('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setRecommendations(data.recommendations || []);
        refreshAllData();
        return { success: true, message: data.message || 'Tối ưu hóa thành công!' };
      }
      return { success: false, message: data.error || 'Lỗi khi tối ưu hóa lịch' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ' };
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Apply AI Recommendation
  const applyRecommendation = async (recId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/ai/apply-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, status: 'applied' } : r))
        );
        if (data.event) {
          setEvents((prev) => [...prev, data.event]);
        }
        refreshAllData();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Reject AI Recommendation
  const rejectRecommendation = async (recId: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/ai/reject-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId }),
      });
      if (res.ok) {
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, status: 'rejected' } : r))
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllNotificationsRead = async () => {
    if (!currentUser) return;
    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const triggerTestNotification = async (title?: string, message?: string) => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/notifications/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: title || '🔔 Sắp đến giờ học',
          message: message || "Bạn có lịch 'Học AI' lúc 19:00. Còn 15 phút.",
        }),
      });
      if (res.ok) {
        const notif: AppNotification = await res.json();
        setNotifications((prev) => [notif, ...prev]);
        setActiveToast(notif);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetDefaultData = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/reset-data', { method: 'POST' });
      await refreshAllData();
    } finally {
      setIsLoading(false);
    }
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        allUsers,
        preferences,
        events,
        tasks,
        recommendations,
        notifications,
        unreadNotificationCount,
        serverTime,
        activeTab,
        setActiveTab,
        isLoading,
        isGeneratingAI,
        isAddEventOpen,
        setIsAddEventOpen,
        isAddTaskOpen,
        setIsAddTaskOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        activeToast,
        dismissToast: () => setActiveToast(null),
        login,
        register,
        logout,
        switchUser,
        updateProfile,
        updatePreferences,
        createEvent,
        updateEvent,
        deleteEvent,
        createTask,
        updateTask,
        deleteTask,
        runAIScheduler,
        applyRecommendation,
        rejectRecommendation,
        markNotificationRead,
        markAllNotificationsRead,
        triggerTestNotification,
        resetDefaultData,
        refreshAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
