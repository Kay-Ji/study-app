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

// Helper: safely parse JSON response, handles non-JSON (HTML) gracefully to avoid "Unexpected token" crashes
async function safeJsonParse(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return null;
  // If content-type says json or text looks like json, try parse
  if (contentType.includes('application/json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    try {
      return JSON.parse(text);
    } catch (e) {
      console.warn('Failed to parse JSON response:', text.slice(0, 200), e);
      // If response is HTML that says "The page..." we treat as error
      if (text.includes('<!doctype') || text.includes('<html') || text.toLowerCase().includes('the page')) {
        throw new Error('Máy chủ trả về trang HTML thay vì JSON. Có thể API endpoint không tồn tại hoặc server chưa chạy.');
      }
      throw new Error('Phản hồi không phải JSON hợp lệ.');
    }
  } else {
    // Non-JSON response (likely HTML)
    if (text.includes('<!doctype') || text.includes('<html')) {
      throw new Error('Máy chủ trả về trang HTML thay vì JSON. Kiểm tra lại API endpoint.');
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}

async function fetchJsonSafe(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(url, options);
    let data = null;
    try {
      data = await safeJsonParse(res);
    } catch (parseErr: any) {
      // If parsing fails, still return with error info
      if (!res.ok) {
        return { ok: false, status: res.status, data: { error: parseErr.message || `Lỗi ${res.status}` } };
      }
      throw parseErr;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    // Network error or parse error
    throw err;
  }
}


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

  // Synchronize server time - FIXED with safe parsing
  const syncServerTime = useCallback(async () => {
    try {
      const clientReqTime = Date.now();
      const result = await fetchJsonSafe('/api/time');
      if (result.ok && result.data) {
        const data: ServerTimeResponse = result.data;
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

  // Helper: fetch user-scoped data for a given userId - FIXED with safe JSON parsing
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      const results = await Promise.all([
        fetchJsonSafe(`/api/events?userId=${userId}`),
        fetchJsonSafe(`/api/tasks?userId=${userId}`),
        fetchJsonSafe(`/api/ai/recommendations?userId=${userId}`),
        fetchJsonSafe(`/api/notifications?userId=${userId}`),
        fetchJsonSafe(`/api/users/${userId}/preferences`),
      ]);

      const [eventsR, tasksR, recsR, notifsR, prefR] = results;

      if (eventsR.ok && eventsR.data) setEvents(eventsR.data);
      else setEvents([]);

      if (tasksR.ok && tasksR.data) setTasks(tasksR.data);
      else setTasks([]);

      if (recsR.ok && recsR.data) setRecommendations(recsR.data);
      else setRecommendations([]);

      if (notifsR.ok && notifsR.data) setNotifications(notifsR.data);
      else setNotifications([]);

      if (prefR.ok && prefR.data) setPreferences(prefR.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  // Initial load: fetch user directory and restore session from localStorage
  // IMPORTANT: We do NOT auto-login to first user anymore. We only restore if savedUserId exists.
  // This fixes the logout bug where logout immediately logged back in as first user.
  // FIXED: Use safe JSON parsing to avoid "Unexpected token" crashes when server returns HTML
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const usersResult = await fetchJsonSafe('/api/users');
        if (usersResult.ok && usersResult.data) {
          const users: User[] = usersResult.data;
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
  // FIXED: Use safe JSON parsing
  const refreshAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const usersResult = await fetchJsonSafe('/api/users');
      if (usersResult.ok && usersResult.data) {
        const users: User[] = usersResult.data;
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

  // Switch User (demo quick switch, no password needed) - FIXED with safe parsing
  const switchUser = async (userId: string) => {
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('planai_userId', user.id);
      try {
        const prefResult = await fetchJsonSafe(`/api/users/${user.id}/preferences`);
        if (prefResult.ok && prefResult.data) {
          setPreferences(prefResult.data);
        }
      } catch (e) {
        console.error('Failed to fetch preferences on switchUser:', e);
      }
      // fetchUserData will be triggered by effect watching currentUser.id
    }
  };

  // Login with Email & Password - FIXED with safe JSON parsing to prevent "Unexpected token" errors
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        return { success: false, error: 'Vui lòng nhập đầy đủ email và mật khẩu.' };
      }

      const result = await fetchJsonSafe('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const data = result.data;

      if (result.ok && data?.user) {
        setCurrentUser(data.user);
        if (data.preferences) setPreferences(data.preferences);
        setAllUsers((prev) => {
          const exists = prev.find((u) => u.id === data.user.id);
          if (exists) return prev.map((u) => (u.id === data.user.id ? { ...u, ...data.user } : u));
          return [...prev, data.user];
        });
        localStorage.setItem('planai_userId', data.user.id);
        localStorage.removeItem('planai_loggedOut');
        setIsAuthModalOpen(false);
        await fetchUserData(data.user.id);
        return { success: true };
      }
      if (result.status === 404) {
        return {
          success: false,
          error: 'Không tìm thấy API máy chủ (HTTP 404). Backend Express chưa chạy hoặc không lắng nghe trên cổng PORT mà nền tảng yêu cầu. Hãy chạy app bằng "npm run dev" (server.ts đã tự đọc process.env.PORT) rồi thử lại.',
        };
      }
      return { success: false, error: data?.error || `Đăng nhập không thành công (HTTP ${result.status}). Vui lòng kiểm tra lại Gmail hoặc mật khẩu.` };
    } catch (err: any) {
      console.error('Login error:', err);
      return { success: false, error: err.message || 'Lỗi kết nối máy chủ.' };
    }
  };

  // Register with Name, Email, Password & Timezone - FIXED with safe parsing
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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail.toLowerCase())) {
        return { success: false, error: 'Email không đúng định dạng (VD: user@gmail.com).' };
      }
      if (trimmedPassword.length < 6) {
        return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
      }

      const result = await fetchJsonSafe('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: trimmedPassword, timezone }),
      });

      const data = result.data;

      if (result.ok && data?.user) {
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
      if (result.status === 404) {
        return {
          success: false,
          error: 'Không tìm thấy API máy chủ (HTTP 404). Backend Express chưa chạy hoặc chạy sai cổng PORT. Hãy khởi động app bằng "npm run dev" rồi thử lại.',
        };
      }
      return { success: false, error: data?.error || `Đăng ký không thành công (HTTP ${result.status}). Email này có thể đã được sử dụng.` };
    } catch (err: any) {
      console.error('Register error:', err);
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

  // Update Profile - FIXED with safe parsing
  const updateProfile = async (data: Partial<User>) => {
    if (!currentUser) return;
    try {
      const result = await fetchJsonSafe(`/api/users/${currentUser.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (result.ok && result.data) {
        const updated = result.data;
        setCurrentUser(updated);
        setAllUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      } else {
        console.error('Failed to update profile:', result.data?.error || `HTTP ${result.status}`);
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
    }
  };

  // Update Preferences - FIXED with safe parsing
  const updatePreferences = async (data: Partial<UserPreferences>) => {
    if (!currentUser) return;
    try {
      const result = await fetchJsonSafe(`/api/users/${currentUser.id}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (result.ok && result.data) {
        setPreferences(result.data);
      }
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  // Event CRUD - FIXED with safe parsing
  const createEvent = async (data: Partial<ScheduleEvent>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const result = await fetchJsonSafe('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: currentUser.id }),
      });
      if (result.ok && result.data) {
        const newEvt = result.data;
        setEvents((prev) => [...prev, newEvt]);
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
      const result = await fetchJsonSafe(`/api/events/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (result.ok && result.data) {
        const updated = result.data;
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

  // Task CRUD - FIXED
  const createTask = async (data: Partial<TaskItem>): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const result = await fetchJsonSafe('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId: currentUser.id }),
      });
      if (result.ok && result.data) {
        const newTask = result.data;
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
      const result = await fetchJsonSafe(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (result.ok && result.data) {
        const updated = result.data;
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

  // AI Scheduler Optimizer - FIXED
  const runAIScheduler = async (): Promise<{ success: boolean; message: string }> => {
    if (!currentUser) return { success: false, message: 'Chưa đăng nhập' };
    try {
      setIsGeneratingAI(true);
      const result = await fetchJsonSafe('/api/ai/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      const data = result.data;
      if (result.ok) {
        setRecommendations(data?.recommendations || []);
        await fetchUserData(currentUser.id);
        return { success: true, message: data?.message || 'Tối ưu hóa thành công!' };
      }
      return { success: false, message: data?.error || 'Lỗi khi tối ưu hóa lịch' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Lỗi kết nối máy chủ' };
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Apply AI Recommendation - FIXED
  const applyRecommendation = async (recId: string): Promise<boolean> => {
    try {
      const result = await fetchJsonSafe('/api/ai/apply-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId }),
      });
      if (result.ok) {
        const data = result.data;
        setRecommendations((prev) =>
          prev.map((r) => (r.id === recId ? { ...r, status: 'applied' } : r))
        );
        if (data?.event) {
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

  // Reject AI Recommendation - FIXED
  const rejectRecommendation = async (recId: string): Promise<boolean> => {
    try {
      const result = await fetchJsonSafe('/api/ai/reject-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId: recId }),
      });
      if (result.ok) {
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
      const result = await fetchJsonSafe('/api/notifications/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          title: title || '🔔 Sắp đến giờ học',
          message: message || "Bạn có lịch 'Học AI' lúc 19:00. Còn 15 phút.",
        }),
      });
      if (result.ok && result.data) {
        const notif: AppNotification = result.data;
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
      await fetchJsonSafe('/api/reset-data', { method: 'POST' });
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
