import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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

  // Track whether initial user restoration has completed to avoid auto-login loops
  const initialLoadDoneRef = useRef(false);

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

  // Helper: clear all user-scoped data (used on logout / guest)
  const clearUserData = useCallback(() => {
    setEvents([]);
    setTasks([]);
    setRecommendations([]);
    setNotifications([]);
    setPreferences(null);
  }, []);

  // Helper: fetch user-scoped data for a given userId
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const [eventsRes, tasksRes, recsRes, notifsRes, prefRes] = await Promise.all([
        fetch(`/api/events?userId=${userId}`),
        fetch(`/api/tasks?userId=${userId}`),
        fetch(`/api/ai/recommendations?userId=${userId}`),
        fetch(`/api/notifications?userId=${userId}`),
        fetch(`/api/users/${userId}/preferences`),
      ]);

      if (eventsRes.ok) setEvents(await eventsRes.json());
      else setEvents([]);

      if (tasksRes.ok) setTasks(await tasksRes.json());
      else setTasks([]);

      if (recsRes.ok) setRecommendations(await recsRes.json());
      else setRecommendations([]);

      if (notifsRes.ok) setNotifications(await notifsRes.json());
      else setNotifications([]);

      if (prefRes.ok) setPreferences(await prefRes.json());
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  // Initial load: fetch user directory and restore session from localStorage
  // IMPORTANT: We do NOT auto-login to first user anymore. We only restore if savedUserId exists.
  // This fixes the logout bug where logout immediately logged back in as first user.
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const users: User[] = await usersRes.json();
          setAllUsers(users);

          const savedUserId = localStorage.getItem('planai_userId');
          if (savedUserId) {
            const found = users.find((u) => u.id === savedUserId);
            if (found) {
              setCurrentUser(found);
              // fetchUserData will be triggered by the effect watching currentUser.id
            } else {
              // Saved id no longer exists (user deleted or db reset)
              localStorage.removeItem('planai_userId');
              setCurrentUser(null);
              clearUserData();
            }
          } else {
            // No saved session -> stay as guest. User must explicitly login/register.
            // This makes auth flow testable and fixes logout auto-login.
            setCurrentUser(null);
            clearUserData();
            // Auto-open auth modal for first-time visitors to make login/register discoverable
            setIsAuthModalOpen(true);
          }
        } else {
          setCurrentUser(null);
          clearUserData();
          setIsAuthModalOpen(true);
        }
      } catch (err) {
        console.error('Initial load failed:', err);
        setCurrentUser(null);
        clearUserData();
        setIsAuthModalOpen(true);
      } finally {
        setIsLoading(false);
        initialLoadDoneRef.current = true;
      }
    };

    init();
  }, [clearUserData]);

  // When currentUser changes (login, register, switch, logout), fetch its data
  // Skip the very first render before initialLoadDone to avoid double fetch.
  useEffect(() => {
    if (!initialLoadDoneRef.current) return;

    if (!currentUser) {
      clearUserData();
      setIsLoading(false);
      return;
    }

    // Current user exists -> fetch its data
    const load = async () => {
      setIsLoading(true);
      await fetchUserData(currentUser.id);
      setIsLoading(false);
    };
    load();
  }, [currentUser?.id, fetchUserData, clearUserData]);

  // Full refresh: re-fetch user list and current user's data (if logged in)
  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const users: User[] = await usersRes.json();
        setAllUsers(users);

        // If we have a current user, keep it and refresh its data
        if (currentUser) {
          const stillExists = users.find((u) => u.id === currentUser.id);
          if (!stillExists) {
            // Current user was deleted (e.g., after reset)
            localStorage.removeItem('planai_userId');
            setCurrentUser(null);
            clearUserData();
          } else {
            await fetchUserData(currentUser.id);
          }
        } else {
          // No current user -> check if we have saved session (e.g., after page reload)
          const savedId = localStorage.getItem('planai_userId');
          if (savedId) {
            const found = users.find((u) => u.id === savedId);
            if (found) {
              setCurrentUser(found);
              // fetchUserData will be triggered by effect
            } else {
              localStorage.removeItem('planai_userId');
              clearUserData();
            }
          } else {
            clearUserData();
          }
        }
      }
    } catch (error) {
      console.error('Error in refreshAllData:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, fetchUserData, clearUserData]);

  // Real-time Reminder Checker
  useEffect(() => {
    if (!currentUser || events.length === 0) return;

    const checkReminders = () => {
      const now = serverTime.getTime();
      const advanceMinutes = preferences?.reminderAdvanceMinutes || 15;
      const advanceMs = advanceMinutes * 60000;

      for (const event of events) {
        const startTime = new Date(event.startTime).getTime();
        const timeDiff = startTime - now;

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

  // Switch User (demo quick switch, no password needed)
  const switchUser = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('planai_userId', user.id);
      try {
        const prefRes = await fetch(`/api/users/${user.id}/preferences`);
        if (prefRes.ok) {
          setPreferences(await prefRes.json());
        }
      } catch (e) {
        console.error('Failed to fetch preferences on switchUser:', e);
      }
      // fetchUserData will be triggered by effect watching currentUser.id
    }
  };

  // Login with Email & Password - FIXED to properly handle errors and session
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        return { success: false, error: 'Máy chủ phản hồi không hợp lệ. Vui lòng thử lại.' };
      }

      if (res.ok && data?.user) {
        setCurrentUser(data.user);
        if (data.preferences) setPreferences(data.preferences);
        // Update allUsers list if needed
        setAllUsers((prev) => {
          const exists = prev.find((u) => u.id === data.user.id);
          if (exists) return prev.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u));
          return [...prev, data.user];
        });
        localStorage.setItem('planai_userId', data.user.id);
        localStorage.removeItem('planai_loggedOut');
        setIsAuthModalOpen(false);
        // Data fetching will be handled by effect watching currentUser.id
        // But also fetch immediately to avoid waiting
        await fetchUserData(data.user.id);
        return { success: true };
      }
      return { success: false, error: data?.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại Gmail hoặc mật khẩu.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  // Register with Name, Email, Password & Timezone - FIXED
  const register = async (
    name: string,
    email: string,
    password: string,
    timezone: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedName) {
        return { success: false, error: 'Vui lòng nhập họ và tên.' };
      }
      if (!trimmedEmail) {
        return { success: false, error: 'Vui lòng nhập email.' };
      }
      // Basic email format validation on client side as well
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail.toLowerCase())) {
        return { success: false, error: 'Email không đúng định dạng (VD: user@gmail.com).' };
      }
      if (trimmedPassword.length < 6) {
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: trimmedPassword, timezone }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        return { success: false, error: 'Máy chủ phản hồi không hợp lệ.' };
      }

      if (res.ok && data?.user) {
        setCurrentUser(data.user);
        if (data.preferences) setPreferences(data.preferences);
        setAllUsers((prev) => {
          const exists = prev.find((u) => u.id === data.user.id);
          if (exists) return prev;
          return [...prev, data.user];
        });
        localStorage.setItem('planai_userId', data.user.id);
        localStorage.removeItem('planai_loggedOut');
        setIsAuthModalOpen(false);
        await fetchUserData(data.user.id);
        return { success: true };
      }
      return { success: false, error: data?.error || 'Đăng ký không thành công. Email này có thể đã được sử dụng.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  // Logout - FIXED to properly clear data and prevent auto-login
  const logout = useCallback(() => {
    localStorage.removeItem('planai_userId');
    localStorage.setItem('planai_loggedOut', 'true'); // mark explicit logout to prevent auto-login
    setCurrentUser(null);
    setPreferences(null);
    clearUserData();
    setActiveTab('home');
    // Optionally close any open modals
    setIsAddEventOpen(false);
    setIsAddTaskOpen(false);
    // Show login modal after logout so user can re-login
    setIsAuthModalOpen(true);
  }, [clearUserData]);

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
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Failed to update profile:', errData.error || res.statusText);
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
        // Refresh to get notifications etc.
        await fetchUserData(currentUser.id);
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
        await fetchUserData(currentUser.id);
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
        if (currentUser) await fetchUserData(currentUser.id);
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
