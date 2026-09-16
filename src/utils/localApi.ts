/**
 * localApi — "Máy chủ thu nhỏ" chạy hoàn toàn trong trình duyệt/điện thoại.
 *
 * Khi app được cài standalone trên điện thoại (PWA) hoặc khi backend không
 * reachable (Vercel cold start, mất mạng...), localApi mô phỏng đúng "hợp đồng"
 * API của server.ts nhưng lưu dữ liệu vào localStorage của thiết bị.
 * Nhờ đó app chạy ĐỘC LẬP hoàn toàn — không cần server nào cả.
 *
 * fetchJsonSafe() trong AppContext tự động chuyển hướng mọi request /api/*
 * vào đây khi chế độ offline được bật.
 */
import {
  User,
  ScheduleEvent,
  TaskItem,
  UserPreferences,
  AIRecommendation,
  AppNotification,
  StudyHistory,
} from '../types';

export const MODE_PREF_KEY = 'planai_mode'; // 'auto' | 'online' | 'offline'
const DB_KEY = 'planai_local_db_v1';

// ---------------------------------------------------------------------------
// Storage abstraction (localStorage in browser, memory shim in Node/tests)
// ---------------------------------------------------------------------------
const memoryStore: Record<string, string> = {};
const store = {
  getItem(key: string): string | null {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch { /* ignore */ }
    return Object.prototype.hasOwnProperty.call(memoryStore, key) ? memoryStore[key] : null;
  },
  setItem(key: string, value: string) {
    try {
      if (typeof localStorage !== 'undefined') { localStorage.setItem(key, value); return; }
    } catch { /* ignore */ }
    memoryStore[key] = value;
  },
  removeItem(key: string) {
    try {
      if (typeof localStorage !== 'undefined') { localStorage.removeItem(key); return; }
    } catch { /* ignore */ }
    delete memoryStore[key];
  },
};

// ---------------------------------------------------------------------------
// Offline mode flag (set by AppContext after auto-probe or manual toggle)
// ---------------------------------------------------------------------------
let runtimeOffline = false;
export function setRuntimeOffline(v: boolean) { runtimeOffline = v; }

// Fallback broadcast: when the backend proves unhealthy mid-session
// (network error / 404 / 5xx) in 'auto' mode, fetchJsonSafe activates the
// offline pipeline and notifies listeners so the React state (offline badge)
// stays in sync.
const fallbackListeners: (() => void)[] = [];
export function onFallbackToOffline(fn: () => void) {
  fallbackListeners.push(fn);
}
export function activateOfflineFallback() {
  if (runtimeOffline) return;
  runtimeOffline = true;
  fallbackListeners.forEach((fn) => {
    try { fn(); } catch { /* ignore listener errors */ }
  });
}

export function getModePreference(): 'auto' | 'online' | 'offline' {
  const v = store.getItem(MODE_PREF_KEY);
  return v === 'online' || v === 'offline' ? v : 'auto';
}
export function setModePreference(mode: 'auto' | 'online' | 'offline') {
  store.setItem(MODE_PREF_KEY, mode);
}
export function isLocalMode(): boolean {
  const pref = getModePreference();
  return pref === 'offline' || (pref === 'auto' && runtimeOffline);
}

/** Probe the real backend quickly; used by auto-detection at startup. */
export async function probeBackend(timeoutMs = 2500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch('/api/time', { signal: controller.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Local database (mirrors server.ts DatabaseSchema)
// ---------------------------------------------------------------------------
interface LocalDb {
  users: (User & { password?: string })[];
  events: ScheduleEvent[];
  tasks: TaskItem[];
  preferences: Record<string, UserPreferences>;
  recommendations: AIRecommendation[];
  notifications: AppNotification[];
  studyHistory: StudyHistory[];
}

const TZ = 'Asia/Ho_Chi_Minh';

function defaultPreferences(userId: string): UserPreferences {
  return {
    userId,
    preferredStartTime: '19:00',
    preferredEndTime: '22:30',
    dailyMaxStudyHours: 4,
    sessionDurationHours: 1.5,
    breakDurationMinutes: 15,
    reminderAdvanceMinutes: 15,
    preferredDays: [1, 2, 3, 4, 5, 6],
    weekendStudyAllowed: true,
  };
}

/** VN time (UTC+7) helper: build UTC ISO for a local date/time. */
function vnToUtcIso(daysAhead: number, hour: number, minute: number): string {
  const d = new Date();
  const base = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + daysAhead, hour - 7, minute, 0);
  return new Date(base).toISOString();
}

function seedDb(): LocalDb {
  const nowIso = new Date().toISOString();
  const users: (User & { password?: string })[] = [
    {
      id: 'usr_1',
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      password: 'password123',
      timezone: TZ,
      bio: 'Sinh viên năm 3 ngành Công nghệ Thông tin & Trí tuệ Nhân tạo',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      createdAt: nowIso,
    },
    {
      id: 'usr_2',
      name: 'Lê Minh Sơn',
      email: 'son.le@gmail.com',
      password: 'password123',
      timezone: TZ,
      bio: 'Kỹ sư phần mềm & Đam mê tự học Machine Learning',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      createdAt: nowIso,
    },
  ];

  const events: ScheduleEvent[] = [
    {
      id: 'evt_l1', userId: 'usr_1', title: 'Lập trình Python',
      description: 'Học trên trường', location: 'Phòng A203', type: 'class',
      priority: 'high', color: '#3b82f6', isFixed: true,
      startTime: vnToUtcIso(1, 7, 30), endTime: vnToUtcIso(1, 9, 30), createdAt: nowIso,
    },
    {
      id: 'evt_l2', userId: 'usr_1', title: 'Học nhóm Machine Learning',
      description: 'Ôn chương 3-4', location: 'Thư viện', type: 'personal',
      priority: 'medium', color: '#8b5cf6', isFixed: false,
      startTime: vnToUtcIso(2, 13, 30), endTime: vnToUtcIso(2, 15, 0), createdAt: nowIso,
    },
    {
      id: 'evt_l3', userId: 'usr_1', title: 'Học AI trên Coursera',
      description: 'Khóa học trực tuyến', type: 'ai_study', priority: 'medium',
      color: '#10b981', isFixed: false,
      startTime: vnToUtcIso(0, 19, 30), endTime: vnToUtcIso(0, 21, 0), createdAt: nowIso,
    },
  ];

  const tasks: TaskItem[] = [
    {
      id: 'task_l1', userId: 'usr_1', title: 'Làm bài tập thuật toán',
      description: 'Chương 4: Đồ thị', deadline: vnToUtcIso(3, 23, 59),
      estimatedDuration: 2, priority: 'high', status: 'pending',
      category: 'study', createdAt: nowIso,
    },
    {
      id: 'task_l2', userId: 'usr_1', title: 'Ôn thi Giữa kỳ CSDL',
      description: 'SQL + chuẩn hóa', deadline: vnToUtcIso(6, 23, 59),
      estimatedDuration: 4, priority: 'urgent', status: 'in_progress',
      category: 'exam_prep', createdAt: nowIso,
    },
    {
      id: 'task_l3', userId: 'usr_1', title: 'Hoàn thiện báo cáo đồ án Web',
      deadline: vnToUtcIso(9, 23, 59), estimatedDuration: 3,
      priority: 'medium', status: 'pending', category: 'project', createdAt: nowIso,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif_l1', userId: 'usr_1',
      title: '👋 Chào mừng đến PlanAI!',
      message: 'Bạn đang dùng chế độ Offline — dữ liệu được lưu an toàn ngay trên thiết bị này.',
      scheduledFor: nowIso, advanceMinutes: 0, read: false,
      createdAt: nowIso, type: 'system',
    },
  ];

  return {
    users,
    events,
    tasks,
    preferences: { usr_1: defaultPreferences('usr_1'), usr_2: defaultPreferences('usr_2') },
    recommendations: [],
    notifications,
    studyHistory: [],
  };
}

let db: LocalDb | null = null;

function loadDb(): LocalDb {
  if (db) return db;
  try {
    const raw = store.getItem(DB_KEY);
    if (raw) {
      db = JSON.parse(raw) as LocalDb;
      return db;
    }
  } catch { /* corrupted -> reseed */ }
  db = seedDb();
  saveDb();
  return db;
}

function saveDb() {
  if (db) store.setItem(DB_KEY, JSON.stringify(db));
}

export function resetLocalDb() {
  db = seedDb();
  saveDb();
}

const uid = (prefix: string) => `${prefix}_l${Date.now()}${Math.floor(Math.random() * 1000)}`;

function stripPassword(u: User & { password?: string }): User {
  const { password: _pw, ...rest } = u;
  return rest;
}

// ---------------------------------------------------------------------------
// Rule-based AI optimizer (compact port of server.ts fallback algorithm)
// ---------------------------------------------------------------------------
function runLocalRecommendations(userId: string): { recommendations: AIRecommendation[]; message: string } {
  const data = loadDb();
  const user = data.users.find((u) => u.id === userId) || data.users[0];
  const prefs = data.preferences[userId] || defaultPreferences(userId);
  const tz = user?.timezone || TZ;
  const now = new Date();

  const userEvents = data.events.filter((e) => e.userId === userId);
  const userTasks = data.tasks.filter((t) => t.userId === userId && t.status !== 'completed');
  if (userTasks.length === 0) {
    return { recommendations: [], message: 'Không có công việc nào chưa hoàn thành để tối ưu!' };
  }

  const [prefStartH, prefStartM] = prefs.preferredStartTime.split(':').map(Number);
  const slotDurationHours = prefs.sessionDurationHours || 1.5;
  const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const wkMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  const candidateSlots: { start: Date; end: Date; dayName: string }[] = [];
  const hourFmt = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false });
  const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const wdFmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const d = new Date(now.getTime() + dayOffset * 86400000);
    const parts: Record<string, string> = {};
    for (const p of dateFmt.formatToParts(d)) if (p.type !== 'literal') parts[p.type] = p.value;
    const weekdayStr = wdFmt.format(d);
    const userDayOfWeek = wkMap[weekdayStr] ?? 1;
    const dayIndex = userDayOfWeek === 0 ? 7 : userDayOfWeek;
    if (!prefs.preferredDays.includes(dayIndex)) continue;

    const desiredH = prefStartH, desiredM = prefStartM || 0;
    const probeBase = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
    let slotStart: Date | null = null;
    for (let off = -14; off <= 14; off += 0.25) {
      const probe = new Date(probeBase + off * 3600000);
      const pp = hourFmt.formatToParts(probe);
      const h = Number(pp.find((x) => x.type === 'hour')?.value);
      const m = Number(pp.find((x) => x.type === 'minute')?.value);
      if (h === desiredH && m === desiredM) { slotStart = probe; break; }
    }
    if (!slotStart) continue;
    const slotEnd = new Date(slotStart.getTime() + slotDurationHours * 3600000);
    if (slotStart.getTime() <= now.getTime() + 15 * 60000) continue;

    const conflict = userEvents.some((evt) =>
      slotStart!.getTime() < new Date(evt.endTime).getTime() &&
      slotEnd.getTime() > new Date(evt.startTime).getTime()
    );
    if (!conflict) candidateSlots.push({ start: slotStart, end: slotEnd, dayName: dayNames[userDayOfWeek] });
  }

  const priorityWeight: Record<string, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
  const sortedTasks = [...userTasks].sort((a, b) => {
    const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
    if (pDiff !== 0) return pDiff;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const recs: AIRecommendation[] = [];
  const usedSlots = new Set<number>();
  for (const task of sortedTasks) {
    if (recs.length >= 4) break;
    const deadline = new Date(task.deadline);
    let bestIdx = -1, bestScore = -1, bestReason = '';
    for (let i = 0; i < candidateSlots.length; i++) {
      if (usedSlots.has(i)) continue;
      const slot = candidateSlots[i];
      if (slot.end.getTime() >= deadline.getTime()) continue;
      const hoursUntilDeadline = (deadline.getTime() - slot.start.getTime()) / 3600000;
      const daysUntil = Math.max(0.5, hoursUntilDeadline / 24);
      const deadlineScore = Math.min(40, Math.max(10, 40 - daysUntil * 3));
      const pScore = task.priority === 'urgent' ? 35 : task.priority === 'high' ? 30 : task.priority === 'medium' ? 20 : 10;
      const freshnessScore = Math.max(5, 25 - i * 3);
      const score = Math.round(deadlineScore + pScore + freshnessScore);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
        bestReason = `Ưu tiên ${task.priority === 'urgent' ? 'RẤT CAO' : task.priority === 'high' ? 'cao' : 'vừa'} — deadline ${Math.round(daysUntil)} ngày nữa. Tối ưu cho ${slot.dayName} (${prefs.preferredStartTime}).`;
      }
    }
    if (bestIdx >= 0) {
      usedSlots.add(bestIdx);
      const slot = candidateSlots[bestIdx];
      recs.push({
        id: uid('rec'),
        userId,
        taskId: task.id,
        taskTitle: task.title,
        suggestedStartTime: slot.start.toISOString(),
        suggestedEndTime: slot.end.toISOString(),
        durationHours: slotDurationHours,
        score: Math.min(98, bestScore),
        reason: bestReason,
        status: 'pending',
        createdAt: now.toISOString(),
      });
    }
  }

  data.recommendations = [
    ...data.recommendations.filter((r) => r.userId !== userId || r.status === 'applied'),
    ...recs,
  ];
  if (recs.length > 0) {
    data.notifications.unshift({
      id: uid('notif'),
      userId,
      title: '🤖 AI (Offline) đã tối ưu lịch trình!',
      message: `Đã tạo ${recs.length} đề xuất phân bổ thời gian dựa trên độ ưu tiên và thời gian rảnh của bạn.`,
      scheduledFor: now.toISOString(),
      advanceMinutes: 0,
      read: false,
      createdAt: now.toISOString(),
      type: 'ai_recommendation',
    });
  }
  saveDb();
  return {
    recommendations: recs,
    message: recs.length > 0
      ? `Đã phân tích và tạo ${recs.length} đề xuất (chế độ offline - thuật toán heuristic).`
      : 'Không tìm thấy khung giờ trống phù hợp trong 7 ngày tới.',
  };
}

// ---------------------------------------------------------------------------
// Request router — same contract as server.ts
// ---------------------------------------------------------------------------
export interface LocalResult { ok: boolean; status: number; data: any }

export async function handleLocalRequest(url: string, options?: RequestInit): Promise<LocalResult> {
  const method = (options?.method || 'GET').toUpperCase();
  let body: any = {};
  if (options?.body) {
    try { body = JSON.parse(String(options.body)); } catch { body = {}; }
  }
  const [pathRaw] = url.split('?');
  const path = pathRaw.replace(/\/+$/, '') || '/';
  const query = new URLSearchParams(url.split('?')[1] || '');
  const data = loadDb();
  const json = (status: number, payload: any): LocalResult => ({ ok: status >= 200 && status < 300, status, data: payload });

  await new Promise((r) => setTimeout(r, 30)); // tiny latency so UI states render naturally

  // ---- time & users ----
  if (method === 'GET' && path === '/api/time') {
    return json(200, { utc: new Date().toISOString(), timestamp: Date.now(), timezoneServer: 'local-device' });
  }
  if (method === 'GET' && path === '/api/users') {
    return json(200, data.users.map(stripPassword));
  }
  if (method === 'GET' && path === '/api/reset-data' && false) { /* noop */ }

  // ---- auth ----
  if (method === 'POST' && path === '/api/auth/login') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const user = data.users.find((u) => u.email.toLowerCase() === email);
    if (!user || user.password !== password) {
      return json(401, { error: 'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.' });
    }
    return json(200, {
      user: stripPassword(user),
      preferences: data.preferences[user.id] || defaultPreferences(user.id),
      token: `local_token_${user.id}`,
    });
  }
  if (method === 'POST' && path === '/api/auth/register') {
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const timezone = String(body.timezone || TZ);
    if (!name) return json(400, { error: 'Vui lòng nhập họ và tên.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(400, { error: 'Email không đúng định dạng.' });
    if (password.length < 6) return json(400, { error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
    if (data.users.some((u) => u.email.toLowerCase() === email)) {
      return json(400, { error: 'Email này đã được đăng ký. Vui lòng chuyển sang tab Đăng nhập.' });
    }
    const user: User & { password?: string } = {
      id: uid('usr'),
      name,
      email,
      password,
      timezone,
      bio: 'Học viên mới tham gia AI Scheduler',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);
    data.preferences[user.id] = defaultPreferences(user.id);
    data.notifications.unshift({
      id: uid('notif'),
      userId: user.id,
      title: '🎉 Chào mừng bạn đến với PlanAI!',
      message: 'Hãy thêm lịch học và công việc của bạn — mọi dữ liệu được lưu ngay trên thiết bị.',
      scheduledFor: new Date().toISOString(),
      advanceMinutes: 0,
      read: false,
      createdAt: new Date().toISOString(),
      type: 'system',
    });
    saveDb();
    return json(201, { user: stripPassword(user), preferences: data.preferences[user.id], token: `local_token_${user.id}` });
  }

  // ---- reset ----
  if (method === 'POST' && path === '/api/reset-data') {
    resetLocalDb();
    return json(200, { success: true, message: 'Đã khôi phục dữ liệu mẫu trên thiết bị.' });
  }

  // ---- events ----
  if (path === '/api/events') {
    if (method === 'GET') {
      const userId = query.get('userId');
      return json(200, data.events.filter((e) => !userId || e.userId === userId));
    }
    if (method === 'POST') {
      const evt: ScheduleEvent = {
        id: uid('evt'),
        userId: body.userId || 'usr_1',
        title: String(body.title || 'Sự kiện mới'),
        description: body.description,
        startTime: body.startTime,
        endTime: body.endTime,
        location: body.location,
        type: body.type || 'personal',
        priority: body.priority || 'medium',
        color: body.color || '#6366f1',
        isFixed: Boolean(body.isFixed),
        createdAt: new Date().toISOString(),
      };
      data.events.push(evt);
      saveDb();
      return json(201, evt);
    }
  }
  let m = path.match(/^\/api\/events\/([^/]+)$/);
  if (m) {
    const evt = data.events.find((e) => e.id === m![1]);
    if (method === 'GET') return evt ? json(200, evt) : json(404, { error: 'Không tìm thấy sự kiện.' });
    if (method === 'PUT') {
      if (!evt) return json(404, { error: 'Không tìm thấy sự kiện.' });
      Object.assign(evt, body);
      saveDb();
      return json(200, evt);
    }
    if (method === 'DELETE') {
      data.events = data.events.filter((e) => e.id !== m![1]);
      saveDb();
      return json(200, { success: true });
    }
  }

  // ---- tasks ----
  if (path === '/api/tasks') {
    if (method === 'GET') {
      const userId = query.get('userId');
      return json(200, data.tasks.filter((t) => !userId || t.userId === userId));
    }
    if (method === 'POST') {
      const task: TaskItem = {
        id: uid('task'),
        userId: body.userId || 'usr_1',
        title: String(body.title || 'Công việc mới'),
        description: body.description,
        deadline: body.deadline || new Date(Date.now() + 3 * 86400000).toISOString(),
        estimatedDuration: Number(body.estimatedDuration) || 2,
        priority: body.priority || 'medium',
        status: body.status || 'pending',
        category: body.category || 'study',
        createdAt: new Date().toISOString(),
      };
      data.tasks.push(task);
      saveDb();
      return json(201, task);
    }
  }
  m = path.match(/^\/api\/tasks\/([^/]+)$/);
  if (m) {
    const task = data.tasks.find((t) => t.id === m![1]);
    if (method === 'GET') return task ? json(200, task) : json(404, { error: 'Không tìm thấy công việc.' });
    if (method === 'PUT') {
      if (!task) return json(404, { error: 'Không tìm thấy công việc.' });
      Object.assign(task, body);
      saveDb();
      return json(200, task);
    }
    if (method === 'DELETE') {
      data.tasks = data.tasks.filter((t) => t.id !== m![1]);
      saveDb();
      return json(200, { success: true });
    }
  }

  // ---- AI ----
  if (path === '/api/ai/recommendations' && method === 'GET') {
    const userId = query.get('userId');
    return json(200, data.recommendations.filter((r) => !userId || r.userId === userId));
  }
  if (path === '/api/ai/recommend' && method === 'POST') {
    const result = runLocalRecommendations(String(body.userId || 'usr_1'));
    return json(200, result);
  }
  if (path === '/api/ai/apply-recommendation' && method === 'POST') {
    const rec = data.recommendations.find((r) => r.id === body.recommendationId);
    if (!rec) return json(404, { error: 'Không tìm thấy đề xuất.' });
    rec.status = 'applied';
    const evt: ScheduleEvent = {
      id: uid('evt'),
      userId: rec.userId,
      title: `📚 ${rec.taskTitle}`,
      description: rec.reason,
      startTime: rec.suggestedStartTime,
      endTime: rec.suggestedEndTime,
      type: 'ai_study',
      priority: 'high',
      color: '#8b5cf6',
      isFixed: false,
      createdAt: new Date().toISOString(),
    };
    data.events.push(evt);
    const task = data.tasks.find((t) => t.id === rec.taskId);
    if (task) task.status = 'in_progress';
    saveDb();
    return json(200, { event: evt, recommendation: rec });
  }
  if (path === '/api/ai/reject-recommendation' && method === 'POST') {
    const rec = data.recommendations.find((r) => r.id === body.recommendationId);
    if (!rec) return json(404, { error: 'Không tìm thấy đề xuất.' });
    rec.status = 'rejected';
    saveDb();
    return json(200, { recommendation: rec });
  }

  // ---- notifications ----
  if (path === '/api/notifications') {
    if (method === 'GET') {
      const userId = query.get('userId');
      return json(200, data.notifications.filter((n) => !userId || n.userId === userId));
    }
  }
  if (path === '/api/notifications/mark-all-read' && method === 'POST') {
    data.notifications.forEach((n) => { if (!body.userId || n.userId === body.userId) n.read = true; });
    saveDb();
    return json(200, { success: true });
  }
  if (path === '/api/notifications/test-trigger' && method === 'POST') {
    const notif: AppNotification = {
      id: uid('notif'),
      userId: String(body.userId || 'usr_1'),
      title: String(body.title || '🔔 Thông báo thử'),
      message: String(body.message || 'Đây là thông báo thử từ chế độ offline.'),
      scheduledFor: new Date().toISOString(),
      advanceMinutes: 0,
      read: false,
      createdAt: new Date().toISOString(),
      type: 'reminder',
    };
    data.notifications.unshift(notif);
    saveDb();
    return json(201, notif);
  }
  m = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (m && method === 'PUT') {
    const notif = data.notifications.find((n) => n.id === m![1]);
    if (notif) { notif.read = true; saveDb(); return json(200, notif); }
    return json(404, { error: 'Không tìm thấy thông báo.' });
  }

  // ---- preferences & profile ----
  m = path.match(/^\/api\/users\/([^/]+)\/preferences$/);
  if (m) {
    const userId = m[1];
    if (method === 'GET') {
      return json(200, data.preferences[userId] || defaultPreferences(userId));
    }
    if (method === 'PUT') {
      const current = data.preferences[userId] || defaultPreferences(userId);
      // Whitelist merge (same spirit as server-side validation)
      const next: UserPreferences = { ...current, userId };
      if (typeof body.preferredStartTime === 'string' && /^\d{2}:\d{2}$/.test(body.preferredStartTime)) next.preferredStartTime = body.preferredStartTime;
      if (typeof body.preferredEndTime === 'string' && /^\d{2}:\d{2}$/.test(body.preferredEndTime)) next.preferredEndTime = body.preferredEndTime;
      if (Number.isFinite(body.dailyMaxStudyHours) && body.dailyMaxStudyHours > 0 && body.dailyMaxStudyHours <= 16) next.dailyMaxStudyHours = Number(body.dailyMaxStudyHours);
      if (Number.isFinite(body.sessionDurationHours) && body.sessionDurationHours > 0 && body.sessionDurationHours <= 8) next.sessionDurationHours = Number(body.sessionDurationHours);
      if (Number.isFinite(body.breakDurationMinutes) && body.breakDurationMinutes >= 0 && body.breakDurationMinutes <= 120) next.breakDurationMinutes = Number(body.breakDurationMinutes);
      if (Number.isFinite(body.reminderAdvanceMinutes) && [5, 10, 15, 30, 60].includes(Number(body.reminderAdvanceMinutes))) next.reminderAdvanceMinutes = Number(body.reminderAdvanceMinutes) as UserPreferences['reminderAdvanceMinutes'];
      if (Array.isArray(body.preferredDays)) next.preferredDays = body.preferredDays.map(Number).filter((d: number) => d >= 1 && d <= 7);
      if (typeof body.weekendStudyAllowed === 'boolean') next.weekendStudyAllowed = body.weekendStudyAllowed;
      data.preferences[userId] = next;
      saveDb();
      return json(200, next);
    }
  }
  m = path.match(/^\/api\/users\/([^/]+)\/profile$/);
  if (m && method === 'PUT') {
    const user = data.users.find((u) => u.id === m![1]);
    if (!user) return json(404, { error: 'Không tìm thấy người dùng.' });
    if (typeof body.name === 'string' && body.name.trim()) user.name = body.name.trim();
    if (typeof body.bio === 'string') user.bio = body.bio;
    if (typeof body.avatar === 'string' && body.avatar) user.avatar = body.avatar;
    if (typeof body.timezone === 'string' && body.timezone) user.timezone = body.timezone;
    saveDb();
    return json(200, stripPassword(user));
  }

  // ---- study history ----
  if (path === '/api/study-history') {
    if (method === 'GET') {
      const userId = query.get('userId');
      return json(200, data.studyHistory.filter((h) => !userId || h.userId === userId));
    }
    if (method === 'POST') {
      const hist: StudyHistory = {
        id: uid('hist'),
        userId: body.userId || 'usr_1',
        taskTitle: String(body.taskTitle || 'Học tập'),
        durationMinutes: Number(body.durationMinutes) || 60,
        completedAt: new Date().toISOString(),
        notes: body.notes,
      };
      data.studyHistory.unshift(hist);
      saveDb();
      return json(201, hist);
    }
  }

  return json(404, { error: `API endpoint không tồn tại (chế độ offline): ${method} ${path}` });
}
