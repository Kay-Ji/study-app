import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import dotenv from "dotenv";
// NOTE: "vite" is imported DYNAMICALLY inside startServer() (dev mode only).
// A static import here would pull the whole Vite package into the Vercel
// serverless bundle, which is unnecessary and can break lambda packaging.
// Same for @google/genai: it is imported DYNAMICALLY inside getAIClient()
// (type-only import below, erased at compile time). If the AI SDK ever fails
// to package/load on the serverless platform, only the AI enhancement
// feature degrades — login, calendar and every other endpoint keep working.
import type { GoogleGenAI } from "@google/genai";
import {
  User,
  ScheduleEvent,
  TaskItem,
  UserPreferences,
  AIRecommendation,
  AppNotification,
  StudyHistory
} from "./src/types";

// Load environment variables from .env (if present) before anything else.
dotenv.config();

// When running inside AI Studio the secrets are injected directly into process.env,
// so a missing .env is not an error.

const app = express();
// IMPORTANT: Hosting platforms (AI Studio, Cloud Run, ...) inject a PORT env var
// and proxy ALL requests (including /api/*) to that exact port. Hardcoding 3000
// made the backend unreachable there -> every API call returned an empty HTTP 404
// (e.g. "Đăng nhập không thành công (HTTP 404)"). Always prefer process.env.PORT.
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Google GenAI client (lazily — see note on the import above)
let aiClient: GoogleGenAI | null = null;
async function getAIClient(): Promise<GoogleGenAI | null> {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI client:", err);
    }
  }
  return aiClient;
}

// In-memory data store with file persistence in /tmp or ./data
// On Vercel (serverless) the deployment filesystem is READ-ONLY.
// The only writable location is /tmp, so the JSON database is stored there
// (seeded fresh from getInitialData() on every cold start).
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "planai-data")
  : path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  users: User[];
  events: ScheduleEvent[];
  tasks: TaskItem[];
  preferences: Record<string, UserPreferences>;
  recommendations: AIRecommendation[];
  notifications: AppNotification[];
  studyHistory: StudyHistory[];
}

function getInitialData(): DatabaseSchema {
  // Current reference date: 2026-09-04 (Thứ 6)
  // Let's compute dates relative to current 2026-09-04 or actual real-time
  const now = new Date();
  
  // Default user Nguyễn Văn A
  const defaultUser: User = {
    id: "usr_1",
    name: "Nguyễn Văn A",
    email: "nguyenvana@gmail.com",
    password: "password123",
    timezone: "Asia/Ho_Chi_Minh",
    bio: "Sinh viên năm 3 ngành Công nghệ Thông tin & Trí tuệ Nhân tạo",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  };

  const defaultUser2: User = {
    id: "usr_2",
    name: "Lê Minh Sơn",
    email: "son.le@gmail.com",
    password: "password123",
    timezone: "Asia/Ho_Chi_Minh",
    bio: "Kỹ sư phần mềm & Đam mê tự học Machine Learning",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
  };

  // Compute helper to get next day of week in UTC (0 = Sun, 1 = Mon, ..., 6 = Sat)
  // Vietnam is UTC+7: 07:30 VN = 00:30 UTC, 09:30 VN = 02:30 UTC
  // 13:30 VN = 06:30 UTC, 15:30 VN = 08:30 UTC
  // 19:00 VN = 12:00 UTC, 21:00 VN = 14:00 UTC
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const date = today.getUTCDate();

  // Reference date strings (UTC format)
  // Next Monday (Thứ 2)
  const daysUntilNextMon = (1 + 7 - today.getUTCDay()) % 7 || 7;
  const nextMon = new Date(Date.UTC(year, month, date + daysUntilNextMon));
  const monStr = nextMon.toISOString().split("T")[0];

  // Next Tuesday (Thứ 3)
  const daysUntilNextTue = (2 + 7 - today.getUTCDay()) % 7 || 7;
  const nextTue = new Date(Date.UTC(year, month, date + daysUntilNextTue));
  const tueStr = nextTue.toISOString().split("T")[0];

  // Next Thursday (Thứ 5)
  const daysUntilNextThu = (4 + 7 - today.getUTCDay()) % 7 || 7;
  const nextThu = new Date(Date.UTC(year, month, date + daysUntilNextThu));
  const thuStr = nextThu.toISOString().split("T")[0];

  // Today string
  const todayStr = today.toISOString().split("T")[0];

  const defaultEvents: ScheduleEvent[] = [
    // Thứ 2: 07:30 - 09:30 Lập trình Python (Phòng A203) [UTC 00:30 - 02:30]
    {
      id: "evt_1",
      userId: "usr_1",
      title: "Lập trình Python",
      description: "Học trên trường - Giảng viên TS. Trần Hoàng",
      location: "Phòng A203 - Tòa H1",
      startTime: `${monStr}T00:30:00.000Z`,
      endTime: `${monStr}T02:30:00.000Z`,
      type: "class",
      priority: "high",
      color: "#3b82f6", // Blue
      isFixed: true,
      createdAt: new Date().toISOString(),
    },
    // Thứ 3: 07:30 - 09:30 Trí tuệ nhân tạo (AI) (Phòng B102) [UTC 00:30 - 02:30]
    {
      id: "evt_2",
      userId: "usr_1",
      title: "Trí tuệ nhân tạo (AI)",
      description: "Lý thuyết & Thảo luận đồ án",
      location: "Phòng B102 - Tòa C2",
      startTime: `${tueStr}T00:30:00.000Z`,
      endTime: `${tueStr}T02:30:00.000Z`,
      type: "class",
      priority: "urgent",
      color: "#6366f1", // Indigo
      isFixed: true,
      createdAt: new Date().toISOString(),
    },
    // Thứ 5: 13:30 - 15:30 Cơ sở dữ liệu (Phòng C305) [UTC 06:30 - 08:30]
    {
      id: "evt_3",
      userId: "usr_1",
      title: "Cơ sở dữ liệu",
      description: "Thực hành thiết kế CSDL quan hệ & NoSQL",
      location: "Phòng C305 - Lab 3",
      startTime: `${thuStr}T06:30:00.000Z`,
      endTime: `${thuStr}T08:30:00.000Z`,
      type: "class",
      priority: "medium",
      color: "#059669", // Emerald
      isFixed: true,
      createdAt: new Date().toISOString(),
    },
    // Today event (e.g. Seminar or regular work)
    {
      id: "evt_4",
      userId: "usr_1",
      title: "Seminar: Ứng dụng AI trong Scheduling",
      description: "Hội thảo trực tuyến qua Google Meet",
      location: "Trực tuyến (Meet)",
      startTime: `${todayStr}T07:00:00.000Z`, // 14:00 VN
      endTime: `${todayStr}T09:00:00.000Z`,   // 16:00 VN
      type: "work",
      priority: "medium",
      color: "#d97706", // Amber
      isFixed: true,
      createdAt: new Date().toISOString(),
    },
  ];

  // Tasks from prompt:
  // 1. Đồ án AI (Deadline 10/09/2026, 8h, Cao)
  // 2. Học Machine Learning (5h/tuần, Cao)
  // 3. Làm bài tập Toán (Deadline 07/09/2026, 3h, Cao)
  // 4. Học Python nâng cao (4h/tuần, Trung bình)
  const defaultTasks: TaskItem[] = [
    {
      id: "tsk_1",
      userId: "usr_1",
      title: "Làm đồ án AI",
      description: "Xây dựng thuật toán AI Scheduler & tối ưu hóa ràng buộc cho ứng dụng thời gian biểu",
      deadline: new Date(Date.now() + 6 * 86400000).toISOString(), // ~6 days ahead (e.g. 10/09)
      estimatedDuration: 8,
      allocatedHours: 2,
      priority: "urgent",
      status: "in_progress",
      category: "project",
      createdAt: new Date().toISOString(),
    },
    {
      id: "tsk_2",
      userId: "usr_1",
      title: "Học Machine Learning",
      description: "Ôn tập Scikit-learn, Random Forest & Gradient Boosting cho bài kiểm tra giữa kỳ",
      deadline: new Date(Date.now() + 8 * 86400000).toISOString(),
      estimatedDuration: 5,
      allocatedHours: 0,
      priority: "high",
      status: "pending",
      category: "study",
      createdAt: new Date().toISOString(),
    },
    {
      id: "tsk_3",
      userId: "usr_1",
      title: "Làm bài tập Toán rời rạc & Giải tích",
      description: "Giải bài tập chương 4 về lý thuyết đồ thị và tối ưu hóa",
      deadline: new Date(Date.now() + 3 * 86400000).toISOString(), // ~3 days ahead (e.g. 07/09)
      estimatedDuration: 3,
      allocatedHours: 1,
      priority: "high",
      status: "pending",
      category: "exercise",
      createdAt: new Date().toISOString(),
    },
    {
      id: "tsk_4",
      userId: "usr_1",
      title: "Học Python nâng cao",
      description: "Tìm hiểu Generators, Decorators và lập trình bất đồng bộ Asyncio",
      deadline: new Date(Date.now() + 10 * 86400000).toISOString(),
      estimatedDuration: 4,
      allocatedHours: 0,
      priority: "medium",
      status: "pending",
      category: "study",
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultPreferences: Record<string, UserPreferences> = {
    usr_1: {
      userId: "usr_1",
      preferredStartTime: "19:00",
      preferredEndTime: "22:30",
      dailyMaxStudyHours: 4,
      sessionDurationHours: 1.5,
      breakDurationMinutes: 15,
      reminderAdvanceMinutes: 15,
      preferredDays: [1, 2, 3, 4, 5, 6], // Mon - Sat
      weekendStudyAllowed: true,
    },
    usr_2: {
      userId: "usr_2",
      preferredStartTime: "20:00",
      preferredEndTime: "23:30",
      dailyMaxStudyHours: 3,
      sessionDurationHours: 1.5,
      breakDurationMinutes: 20,
      reminderAdvanceMinutes: 30,
      preferredDays: [1, 2, 3, 4, 5],
      weekendStudyAllowed: false,
    },
  };

  const defaultRecommendations: AIRecommendation[] = [
    {
      id: "rec_1",
      userId: "usr_1",
      taskId: "tsk_1",
      taskTitle: "Làm đồ án AI",
      suggestedStartTime: `${tueStr}T12:00:00.000Z`, // 19:00 VN
      suggestedEndTime: `${tueStr}T14:00:00.000Z`,   // 21:00 VN
      durationHours: 2,
      score: 91,
      reason: "Bạn nên dành 2 giờ vào Thứ 3 (19:00 - 21:00) để làm Đồ án AI vì deadline còn 5 ngày, đây là nhiệm vụ ưu tiên khẩn cấp và khung giờ tối phù hợp với thói quen tập trung sâu của bạn.",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rec_2",
      userId: "usr_1",
      taskId: "tsk_3",
      taskTitle: "Làm bài tập Toán rời rạc & Giải tích",
      suggestedStartTime: `${monStr}T12:00:00.000Z`, // 19:00 VN
      suggestedEndTime: `${monStr}T13:30:00.000Z`,   // 20:30 VN
      durationHours: 1.5,
      score: 86,
      reason: "Xếp vào Thứ 2 (19:00 - 20:30) vì deadline chỉ còn 3 ngày, sau buổi học Python sáng bạn có đủ thời gian nghỉ ngơi trước ca học tối.",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: "rec_3",
      userId: "usr_1",
      taskId: "tsk_2",
      taskTitle: "Học Machine Learning",
      suggestedStartTime: `${thuStr}T12:00:00.000Z`, // 19:00 VN
      suggestedEndTime: `${thuStr}T13:30:00.000Z`,   // 20:30 VN
      durationHours: 1.5,
      score: 79,
      reason: "Phân bổ 1.5 giờ vào Thứ 5 nhằm hoàn thành mục tiêu 5 giờ/tuần mà không làm quá tải ngày học Cơ sở dữ liệu buổi chiều.",
      status: "pending",
      createdAt: new Date().toISOString(),
    },
  ];

  const defaultNotifications: AppNotification[] = [
    {
      id: "notif_1",
      userId: "usr_1",
      title: "🔔 Sắp đến giờ học",
      message: "Bạn có lịch 'Lập trình Python' lúc 07:30 (Phòng A203). Còn 15 phút.",
      eventId: "evt_1",
      scheduledFor: `${monStr}T00:15:00.000Z`,
      advanceMinutes: 15,
      read: false,
      createdAt: new Date().toISOString(),
      type: "reminder",
    },
    {
      id: "notif_2",
      userId: "usr_1",
      title: "🤖 Đề xuất lịch học mới từ AI",
      message: "AI đã tìm thấy 3 khoảng trống tối ưu cho Đồ án AI và Bài tập Toán trong tuần tới!",
      scheduledFor: new Date().toISOString(),
      advanceMinutes: 0,
      read: false,
      createdAt: new Date().toISOString(),
      type: "ai_recommendation",
    },
    {
      id: "notif_3",
      userId: "usr_1",
      title: "⚠️ Cảnh báo Deadline",
      message: "Bài tập Toán rời rạc & Giải tích sẽ đến hạn trong 3 ngày nữa.",
      taskId: "tsk_3",
      scheduledFor: new Date().toISOString(),
      advanceMinutes: 0,
      read: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      type: "deadline",
    },
  ];

  const defaultStudyHistory: StudyHistory[] = [
    {
      id: "hist_1",
      userId: "usr_1",
      taskTitle: "Làm đồ án AI - Module dữ liệu",
      durationMinutes: 120,
      completedAt: new Date(Date.now() - 86400000).toISOString(),
      notes: "Hoàn thành tiền xử lý dataset",
    },
    {
      id: "hist_2",
      userId: "usr_1",
      taskTitle: "Ôn tập Python OOP",
      durationMinutes: 90,
      completedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      notes: "Ôn tập Class inheritance và Magic methods",
    },
  ];

  return {
    users: [defaultUser, defaultUser2],
    events: defaultEvents,
    tasks: defaultTasks,
    preferences: defaultPreferences,
    recommendations: defaultRecommendations,
    notifications: defaultNotifications,
    studyHistory: defaultStudyHistory,
  };
}

// Load or initialize DB
let db: DatabaseSchema;
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DATA_FILE)) {
    db = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    // Ensure all existing users have a password and appropriate Gmail mapping
    if (db.users && Array.isArray(db.users)) {
      db.users.forEach((u) => {
        if (!u.password) {
          u.password = "password123";
        }
        if (u.id === "usr_1" && u.email === "nguyenvana@university.edu.vn") {
          u.email = "nguyenvana@gmail.com";
        }
        if (u.id === "usr_2" && u.email === "son.le@techcorp.vn") {
          u.email = "son.le@gmail.com";
        }
      });
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
    }
  } else {
    db = getInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  }
} catch (err) {
  console.error("Error loading database, using in-memory defaults:", err);
  db = getInitialData();
}

function saveDb() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save DB to disk:", err);
  }
}

// ---------------- API ENDPOINTS ----------------

// 1. Server Time endpoint (Real-time UTC sync)
app.get("/api/time", (req, res) => {
  const now = new Date();
  res.json({
    utc: now.toISOString(),
    timestamp: now.getTime(),
    timezoneServer: "UTC",
  });
});

// 2. Authentication & Users
app.get("/api/users", (req, res) => {
  // Don't expose passwords in public user listing
  const sanitizedUsers = db.users.map(({ password, ...rest }) => rest);
  res.json(sanitizedUsers);
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ tên đăng nhập (Gmail) và mật khẩu." });
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();

  // Find user by email or by alias
  const user = db.users.find((u) => {
    const userEmail = (u.email || "").toLowerCase();
    return (
      userEmail === cleanEmail ||
      (u.id === "usr_1" && (cleanEmail === "nguyenvana@gmail.com" || cleanEmail === "nguyenvana@university.edu.vn")) ||
      (u.id === "usr_2" && (cleanEmail === "son.le@gmail.com" || cleanEmail === "son.le@techcorp.vn"))
    );
  });

  if (!user) {
    return res.status(404).json({
      error: "Không tìm thấy tài khoản với tên đăng nhập (Gmail) này. Vui lòng kiểm tra lại hoặc chuyển sang tab Đăng ký.",
    });
  }

  const storedPassword = user.password || "";
  // Demo backdoor: the two seeded demo accounts (usr_1, usr_2) always accept the
  // documented demo password "password123", so the demo credentials shown in the
  // UI keep working even after their stored password is changed. This is
  // restricted to the two seed accounts only — registered users always require
  // an exact password match. Set DEMO_MODE=false to disable the backdoor
  // (e.g. in production where only real password matches should succeed).
  const demoBackdoorEnabled = process.env.DEMO_MODE !== "false";
  const isSeedDemoAccount = user.id === "usr_1" || user.id === "usr_2";
  const passwordsMatch =
    storedPassword === cleanPassword ||
    (demoBackdoorEnabled && isSeedDemoAccount && cleanPassword === "password123");

  if (!passwordsMatch) {
    return res.status(401).json({
      error: "Mật khẩu không chính xác. Vui lòng thử lại.",
    });
  }

  const prefs = db.preferences[user.id] || {
    userId: user.id,
    preferredStartTime: "19:00",
    preferredEndTime: "22:30",
    dailyMaxStudyHours: 4,
    sessionDurationHours: 1.5,
    breakDurationMinutes: 15,
    reminderAdvanceMinutes: 15,
    preferredDays: [1, 2, 3, 4, 5, 6],
    weekendStudyAllowed: true,
  };

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    user: userWithoutPassword,
    preferences: prefs,
    token: `jwt_token_${user.id}_${Date.now()}`,
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, timezone } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "Vui lòng cung cấp tên đăng nhập (Gmail) và mật khẩu." });
  }

  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = (password || "").trim();
  const cleanNameRaw = (name || "").trim();
  const cleanName = cleanNameRaw || cleanEmail.split("@")[0] || "Người dùng mới";

  if (cleanNameRaw && cleanNameRaw.length < 2) {
    return res.status(400).json({ error: "Họ và tên phải có ít nhất 2 ký tự." });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: "Tên đăng nhập không đúng định dạng Gmail/Email (VD: user@gmail.com)." });
  }

  // Validate password length
  if (cleanPassword.length < 6) {
    return res.status(400).json({ error: "Mật khẩu bảo mật phải có độ dài tối thiểu từ 6 ký tự trở lên." });
  }

  const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    return res.status(400).json({ error: "Tên đăng nhập (Gmail) này đã được đăng ký. Vui lòng chuyển sang tab Đăng nhập." });
  }

  const newUser: User = {
    id: `usr_${Date.now()}`,
    name: cleanName,
    email: cleanEmail,
    password: cleanPassword,
    timezone: timezone || "Asia/Ho_Chi_Minh",
    bio: "Học viên mới tham gia AI Scheduler",
    avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
    createdAt: new Date().toISOString(),
  };

  const newPrefs: UserPreferences = {
    userId: newUser.id,
    preferredStartTime: "19:00",
    preferredEndTime: "22:30",
    dailyMaxStudyHours: 4,
    sessionDurationHours: 1.5,
    breakDurationMinutes: 15,
    reminderAdvanceMinutes: 15,
    preferredDays: [1, 2, 3, 4, 5, 6],
    weekendStudyAllowed: true,
  };

  db.users.push(newUser);
  db.preferences[newUser.id] = newPrefs;
  saveDb();

  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    user: userWithoutPassword,
    preferences: newPrefs,
    token: `jwt_token_${newUser.id}_${Date.now()}`,
  });
});

app.put("/api/users/:userId/profile", (req, res) => {
  const { userId } = req.params;
  const index = db.users.findIndex((u) => u.id === userId);
  if (index === -1) {
    return res.status(404).json({ error: "Không tìm thấy người dùng." });
  }
  const { name, timezone, bio, avatar, password, email } = req.body;

  // Email update with uniqueness check
  if (email !== undefined) {
    const cleanEmail = String(email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: "Email không đúng định dạng (VD: user@gmail.com)." });
    }
    const existing = db.users.find((u) => u.email.toLowerCase() === cleanEmail && u.id !== userId);
    if (existing) {
      return res.status(400).json({ error: "Email này đã được sử dụng bởi tài khoản khác." });
    }
    db.users[index].email = cleanEmail;
  }

  if (name) {
    const cleanName = String(name).trim();
    if (cleanName.length < 2) {
      return res.status(400).json({ error: "Họ và tên phải có ít nhất 2 ký tự." });
    }
    db.users[index].name = cleanName;
  }
  if (timezone) db.users[index].timezone = timezone;
  if (bio !== undefined) db.users[index].bio = bio;
  if (avatar) db.users[index].avatar = avatar;
  if (password) {
    const cleanPwd = String(password).trim();
    if (cleanPwd.length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }
    db.users[index].password = cleanPwd;
  }
  saveDb();
  const { password: _, ...userWithoutPassword } = db.users[index];
  res.json(userWithoutPassword);
});

app.get("/api/users/:userId/preferences", (req, res) => {
  const { userId } = req.params;
  const prefs = db.preferences[userId] || {
    userId,
    preferredStartTime: "19:00",
    preferredEndTime: "22:30",
    dailyMaxStudyHours: 4,
    sessionDurationHours: 1.5,
    breakDurationMinutes: 15,
    reminderAdvanceMinutes: 15,
    preferredDays: [1, 2, 3, 4, 5, 6],
    weekendStudyAllowed: true,
  };
  res.json(prefs);
});

app.put("/api/users/:userId/preferences", (req, res) => {
  const { userId } = req.params;
  const existing = db.preferences[userId] || {
    userId,
    preferredStartTime: "19:00",
    preferredEndTime: "22:30",
    dailyMaxStudyHours: 4,
    sessionDurationHours: 1.5,
    breakDurationMinutes: 15,
    reminderAdvanceMinutes: 15,
    preferredDays: [1, 2, 3, 4, 5, 6],
    weekendStudyAllowed: true,
  };

  const body = req.body || {};
  // Whitelist accepted fields and validate them to prevent garbage writes.
  const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;
  const merged: UserPreferences = { ...existing, userId };

  if (typeof body.preferredStartTime === "string" && timeRe.test(body.preferredStartTime)) {
    merged.preferredStartTime = body.preferredStartTime;
  }
  if (typeof body.preferredEndTime === "string" && timeRe.test(body.preferredEndTime)) {
    merged.preferredEndTime = body.preferredEndTime;
  }
  if (typeof body.dailyMaxStudyHours === "number" && body.dailyMaxStudyHours >= 1 && body.dailyMaxStudyHours <= 12) {
    merged.dailyMaxStudyHours = body.dailyMaxStudyHours;
  }
  if (typeof body.sessionDurationHours === "number" && body.sessionDurationHours >= 0.5 && body.sessionDurationHours <= 6) {
    merged.sessionDurationHours = body.sessionDurationHours;
  }
  if (typeof body.breakDurationMinutes === "number" && body.breakDurationMinutes >= 5 && body.breakDurationMinutes <= 60) {
    merged.breakDurationMinutes = body.breakDurationMinutes;
  }
  if ([5, 10, 15, 30, 60].includes(body.reminderAdvanceMinutes)) {
    merged.reminderAdvanceMinutes = body.reminderAdvanceMinutes;
  }
  if (Array.isArray(body.preferredDays)) {
    const validDays = body.preferredDays.filter((d: any) => typeof d === "number" && d >= 1 && d <= 7);
    if (validDays.length > 0) merged.preferredDays = validDays;
  }
  if (typeof body.weekendStudyAllowed === "boolean") {
    merged.weekendStudyAllowed = body.weekendStudyAllowed;
  }

  db.preferences[userId] = merged;
  saveDb();
  res.json(db.preferences[userId]);
});

// 3. Events CRUD
app.get("/api/events", (req, res) => {
  const { userId } = req.query;
  const events = userId ? db.events.filter((e) => e.userId === userId) : db.events;
  res.json(events);
});

app.post("/api/events", (req, res) => {
  const { userId, title, description, startTime, endTime, location, type, priority, color, isFixed } = req.body;
  if (!userId || !title || !startTime || !endTime) {
    return res.status(400).json({ error: "Thiếu thông tin sự kiện bắt buộc." });
  }
  const newEvent: ScheduleEvent = {
    id: `evt_${Date.now()}`,
    userId,
    title,
    description: description || "",
    startTime,
    endTime,
    location: location || "",
    type: type || "class",
    priority: priority || "medium",
    color: color || (type === "class" ? "#3b82f6" : type === "ai_study" ? "#8b5cf6" : "#10b981"),
    isFixed: isFixed ?? true,
    createdAt: new Date().toISOString(),
  };
  db.events.push(newEvent);

  // Auto-schedule notification for this event based on user preference
  const prefs = db.preferences[userId] || { reminderAdvanceMinutes: 15 };
  const advanceMin = prefs.reminderAdvanceMinutes || 15;
  const eventStartDate = new Date(startTime);
  const reminderTime = new Date(eventStartDate.getTime() - advanceMin * 60000);

  const newNotif: AppNotification = {
    id: `notif_${Date.now()}`,
    userId,
    title: "🔔 Sắp đến giờ " + (type === "class" ? "học" : type === "ai_study" ? "tự học AI" : "công việc"),
    message: `Bạn có lịch '${title}' lúc ${eventStartDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}. Còn ${advanceMin} phút.`,
    eventId: newEvent.id,
    scheduledFor: reminderTime.toISOString(),
    advanceMinutes: advanceMin,
    read: false,
    createdAt: new Date().toISOString(),
    type: "reminder",
  };
  db.notifications.unshift(newNotif);

  saveDb();
  res.status(201).json(newEvent);
});

app.put("/api/events/:id", (req, res) => {
  const { id } = req.params;
  const index = db.events.findIndex((e) => e.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Không tìm thấy sự kiện." });
  }
  db.events[index] = {
    ...db.events[index],
    ...req.body,
    id,
  };
  saveDb();
  res.json(db.events[index]);
});

app.delete("/api/events/:id", (req, res) => {
  const { id } = req.params;
  db.events = db.events.filter((e) => e.id !== id);
  db.notifications = db.notifications.filter((n) => n.eventId !== id);
  saveDb();
  res.json({ success: true, message: "Đã xóa sự kiện thành công." });
});

// 4. Tasks CRUD
app.get("/api/tasks", (req, res) => {
  const { userId } = req.query;
  const tasks = userId ? db.tasks.filter((t) => t.userId === userId) : db.tasks;
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const { userId, title, description, deadline, estimatedDuration, priority, category } = req.body;
  if (!userId || !title || !deadline) {
    return res.status(400).json({ error: "Thiếu tên công việc hoặc deadline." });
  }
  const newTask: TaskItem = {
    id: `tsk_${Date.now()}`,
    userId,
    title,
    description: description || "",
    deadline,
    estimatedDuration: Number(estimatedDuration) || 2,
    priority: priority || "medium",
    status: "pending",
    category: category || "study",
    allocatedHours: 0,
    createdAt: new Date().toISOString(),
  };
  db.tasks.push(newTask);
  saveDb();
  res.status(201).json(newTask);
});

app.put("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const index = db.tasks.findIndex((t) => t.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Không tìm thấy công việc." });
  }
  db.tasks[index] = {
    ...db.tasks[index],
    ...req.body,
    id,
  };
  saveDb();
  res.json(db.tasks[index]);
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  db.tasks = db.tasks.filter((t) => t.id !== id);
  db.recommendations = db.recommendations.filter((r) => r.taskId !== id);
  saveDb();
  res.json({ success: true, message: "Đã xóa công việc." });
});

// 5. AI Scheduler & Recommendations
app.get("/api/ai/recommendations", (req, res) => {
  const { userId } = req.query;
  const recs = userId ? db.recommendations.filter((r) => r.userId === userId) : db.recommendations;
  res.json(recs);
});

app.post("/api/ai/recommend", async (req, res) => {
  try {
    const { userId } = req.body;
    const targetUserId = userId || "usr_1";
    const user = db.users.find((u) => u.id === targetUserId) || db.users[0];
    const userPrefs = db.preferences[targetUserId] || {
      preferredStartTime: "19:00",
      preferredEndTime: "22:30",
      dailyMaxStudyHours: 4,
      sessionDurationHours: 1.5,
      breakDurationMinutes: 15,
      reminderAdvanceMinutes: 15,
      preferredDays: [1, 2, 3, 4, 5, 6],
      weekendStudyAllowed: true,
    };

    const userEvents = db.events.filter((e) => e.userId === targetUserId);
    const userTasks = db.tasks.filter((t) => t.userId === targetUserId && t.status !== "completed");

    if (userTasks.length === 0) {
      return res.json({
        recommendations: [],
        message: "Không có công việc nào chưa hoàn thành để tối ưu!",
      });
    }

    // Algorithmic Constraint Optimizer:
    // Generate candidate slots for the next 7 days in the user's preferred study window
    // (e.g., 19:00 to 22:30 Vietnam Time, or converted to UTC)
    const now = new Date();
    const candidateSlots: { start: Date; end: Date; dateStr: string; dayName: string }[] = [];

    const dayNames = ["Chủ Nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

    // Parse preferred start/end time (in Vietnam UTC+7)
    const [prefStartH, prefStartM] = userPrefs.preferredStartTime.split(":").map(Number);
    const [prefEndH, prefEndM] = userPrefs.preferredEndTime.split(":").map(Number);
    const slotDurationHours = userPrefs.sessionDurationHours || 1.5;

    // Determine the user's timezone offset dynamically (respects DST).
    const tz = user.timezone || "Asia/Ho_Chi_Minh";
    const getTzDateParts = (date: Date) => {
      // Use Intl.DateTimeFormat parts to get Y/M/D in user's timezone.
      const fmt = new Intl.DateTimeFormat("en-CA", {
        timeZone: tz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const parts = fmt.formatToParts(date);
      const obj: Record<string, string> = {};
      for (const p of parts) if (p.type !== "literal") obj[p.type] = p.value;
      return {
        year: Number(obj.year),
        month: Number(obj.month) - 1,
        day: Number(obj.day),
      };
    };

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const d = new Date(now.getTime() + dayOffset * 86400000);
      const userDateParts = getTzDateParts(d);

      // Compute day-of-week in user's timezone (0=Sun .. 6=Sat).
      const userMidnight = new Date(Date.UTC(userDateParts.year, userDateParts.month, userDateParts.day));
      const dayOfWeek = new Date(
        userMidnight.getTime() - new Date(userMidnight.toLocaleString("en-US", { timeZone: "UTC" })).getTimezoneOffset() * 60000
      );
      // Simpler approach: build a representative local date and query via Intl.
      const weekdayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
      const weekdayStr = weekdayFmt.format(d);
      const wkMap: Record<string, number> = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
      };
      const userDayOfWeek = wkMap[weekdayStr];

      // 1=Mon..7=Sun
      const dayIndex = userDayOfWeek === 0 ? 7 : userDayOfWeek;
      if (!userPrefs.preferredDays.includes(dayIndex)) {
        continue;
      }

      // Compute UTC start of slot: on user-local date YYYY-MM-DD at prefStartH:M in tz.
      // Strategy: first build "YYYY-MM-DDTHH:MM:00" and parse via an Intl hack by trying offsets.
      // We search UTC hour such that formatting that UTC instant in tz yields the desired hour.
      const desiredLocalMinute = prefStartM || 0;
      let slotStartUTC: Date | null = null;
      // Start from UTC midnight of the UTC date and search +/- 14 hours.
      const probeBase = new Date(Date.UTC(userDateParts.year, userDateParts.month, userDateParts.day));
      for (let offsetH = -14; offsetH <= 14; offsetH += 0.25) {
        const probe = new Date(probeBase.getTime() + offsetH * 3600000);
        const probeParts = new Intl.DateTimeFormat("en-GB", {
          timeZone: tz,
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(probe);
        const h = Number(probeParts.find((p) => p.type === "hour")?.value);
        const m = Number(probeParts.find((p) => p.type === "minute")?.value);
        if (h === prefStartH && m === desiredLocalMinute) {
          slotStartUTC = probe;
          break;
        }
      }
      if (!slotStartUTC) {
        // Fallback: assume UTC+7 (Vietnam)
        slotStartUTC = new Date(Date.UTC(
          userDateParts.year,
          userDateParts.month,
          userDateParts.day,
          prefStartH - 7,
          desiredLocalMinute,
          0
        ));
      }
      const slotEndUTC = new Date(slotStartUTC.getTime() + slotDurationHours * 3600000);

      // Verify slot is in the future
      if (slotStartUTC.getTime() > now.getTime() + 15 * 60000) {
        // Check collision with any existing fixed event or scheduled event
        const hasConflict = userEvents.some((evt) => {
          const evtStart = new Date(evt.startTime).getTime();
          const evtEnd = new Date(evt.endTime).getTime();
          return slotStartUTC!.getTime() < evtEnd && slotEndUTC.getTime() > evtStart;
        });

        if (!hasConflict) {
          candidateSlots.push({
            start: slotStartUTC,
            end: slotEndUTC,
            dateStr: slotStartUTC.toISOString().split("T")[0],
            dayName: dayNames[userDayOfWeek],
          });
        }
      }
    }

    // Sort tasks by priority & deadline urgency
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const sortedTasks = [...userTasks].sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 1) - (priorityWeight[a.priority] || 1);
      if (pDiff !== 0) return pDiff;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    const generatedRecs: AIRecommendation[] = [];
    const usedSlotIndices = new Set<number>();

    // Match tasks to candidate slots with scoring
    for (const task of sortedTasks) {
      if (generatedRecs.length >= 4) break; // Limit to 4 optimal recommendations

      const taskDeadline = new Date(task.deadline);
      let bestSlotIndex = -1;
      let highestScore = -1;
      let bestReason = "";

      for (let i = 0; i < candidateSlots.length; i++) {
        if (usedSlotIndices.has(i)) continue;
        const slot = candidateSlots[i];

        // Must complete before deadline
        if (slot.end.getTime() >= taskDeadline.getTime()) continue;

        // Multi-factor scoring (Level 2 & 3 AI Scheduler):
        // 1. Deadline proximity score (0-40)
        const hoursUntilDeadline = (taskDeadline.getTime() - slot.start.getTime()) / 3600000;
        const daysUntilDeadline = Math.max(0.5, hoursUntilDeadline / 24);
        const deadlineScore = Math.min(40, Math.max(10, 40 - daysUntilDeadline * 3));

        // 2. Priority score (0-35)
        const pScore =
          task.priority === "urgent" ? 35 : task.priority === "high" ? 30 : task.priority === "medium" ? 20 : 10;

        // 3. Spacing & Workload score (0-25)
        // Bonus for earlier available slot if urgent, bonus for spacing
        const freshnessScore = Math.max(5, 25 - i * 3);

        const totalScore = Math.min(98, Math.round(deadlineScore + pScore + freshnessScore));

        if (totalScore > highestScore) {
          highestScore = totalScore;
          bestSlotIndex = i;
          bestReason = `Phân bổ ${slotDurationHours} giờ vào ${slot.dayName} (${userPrefs.preferredStartTime} - ${userPrefs.preferredEndTime}) cho '${task.title}' vì deadline còn khoảng ${Math.round(daysUntilDeadline)} ngày, mức độ ưu tiên ${task.priority.toUpperCase()} và không trùng lịch cố định.`;
        }
      }

      if (bestSlotIndex !== -1) {
        usedSlotIndices.add(bestSlotIndex);
        const selectedSlot = candidateSlots[bestSlotIndex];

        generatedRecs.push({
          id: `rec_${Date.now()}_${generatedRecs.length}`,
          userId: targetUserId,
          taskId: task.id,
          taskTitle: task.title,
          suggestedStartTime: selectedSlot.start.toISOString(),
          suggestedEndTime: selectedSlot.end.toISOString(),
          durationHours: slotDurationHours,
          score: highestScore,
          reason: bestReason,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Now, enhance recommendations reasoning using Gemini AI if key is present!
    const genAI = await getAIClient();
    if (genAI && generatedRecs.length > 0) {
      try {
        const prompt = `Bạn là hệ thống AI Scheduler hỗ trợ sinh viên & người đi làm tối ưu lịch trình học tập.
Dưới đây là thông tin người dùng:
- Tên: ${user.name}
- Thói quen học tập: Từ ${userPrefs.preferredStartTime} đến ${userPrefs.preferredEndTime}, tối đa ${userPrefs.dailyMaxStudyHours}h/ngày.
- Các môn học cố định đã có (không được xếp đè):
${userEvents.map((e) => `  * ${e.title}: ${e.startTime} - ${e.endTime}`).join("\n")}
- Đề xuất các khung giờ được thuật toán Constraint Optimization lựa chọn:
${generatedRecs.map((r, i) => `${i + 1}. Task: ${r.taskTitle} | Giờ đề xuất: ${r.suggestedStartTime} đến ${r.suggestedEndTime} (Thời lượng: ${r.durationHours}h, Điểm score: ${r.score})`).join("\n")}

Hãy viết lại câu giải thích lý do (reason) bằng tiếng Việt cho từng đề xuất theo phong cách chuyên nghiệp, khích lệ và chuẩn xác theo nguyên tắc khoa học quản lý thời gian (Pomodoro, Spaced Repetition, tránh kiệt sức).
Trả về JSON đúng định dạng:
{
  "reasons": [
    { "index": 0, "reason": "..." },
    { "index": 1, "reason": "..." }
  ],
  "overallAdvice": "Lời khuyên tổng quan về việc phân bổ năng lượng trong tuần..."
}`;

        const aiResponse = await genAI.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });

        const parsed = JSON.parse(aiResponse.text || "{}");
        if (parsed.reasons && Array.isArray(parsed.reasons)) {
          for (const item of parsed.reasons) {
            if (generatedRecs[item.index] && item.reason) {
              generatedRecs[item.index].reason = item.reason;
            }
          }
        }
      } catch (geminiError) {
        console.warn("Gemini enhancement skipped, using algorithmic reasoning:", geminiError);
      }
    }

    // Save recommendations
    db.recommendations = [...generatedRecs, ...db.recommendations.filter((r) => r.status !== "pending")];

    // Create a notification about new AI recommendations
    if (generatedRecs.length > 0) {
      db.notifications.unshift({
        id: `notif_${Date.now()}`,
        userId: targetUserId,
        title: "🤖 AI đã tối ưu hóa lịch trình!",
        message: `Đã tạo ${generatedRecs.length} đề xuất phân bổ thời gian thông minh dựa trên độ ưu tiên và thời gian rảnh của bạn.`,
        scheduledFor: new Date().toISOString(),
        advanceMinutes: 0,
        read: false,
        createdAt: new Date().toISOString(),
        type: "ai_recommendation",
      });
    }

    saveDb();
    res.json({
      recommendations: generatedRecs,
      message: `Đã phân tích thành công và tạo ${generatedRecs.length} đề xuất tối ưu.`,
    });
  } catch (error: any) {
    console.error("AI recommend error:", error);
    res.status(500).json({ error: error.message || "Lỗi khi chạy thuật toán AI Scheduler." });
  }
});

// Apply AI recommendation -> convert to scheduled event!
app.post("/api/ai/apply-recommendation", (req, res) => {
  const { recommendationId } = req.body;
  const recIndex = db.recommendations.findIndex((r) => r.id === recommendationId);
  if (recIndex === -1) {
    return res.status(404).json({ error: "Không tìm thấy đề xuất." });
  }

  const rec = db.recommendations[recIndex];
  rec.status = "applied";

  // Create an event in user's schedule
  const newEvent: ScheduleEvent = {
    id: `evt_ai_${Date.now()}`,
    userId: rec.userId,
    title: `[AI] ${rec.taskTitle}`,
    description: `Lịch học do AI Scheduler đề xuất: ${rec.reason}`,
    startTime: rec.suggestedStartTime,
    endTime: rec.suggestedEndTime,
    location: "Khu vực tự học / Phòng làm việc",
    type: "ai_study",
    priority: "high",
    color: "#8b5cf6", // Purple for AI
    isFixed: false,
    createdAt: new Date().toISOString(),
  };
  db.events.push(newEvent);

  // Update task allocated hours
  const taskIndex = db.tasks.findIndex((t) => t.id === rec.taskId);
  if (taskIndex !== -1) {
    db.tasks[taskIndex].allocatedHours = (db.tasks[taskIndex].allocatedHours || 0) + rec.durationHours;
    if (db.tasks[taskIndex].status === "pending") {
      db.tasks[taskIndex].status = "in_progress";
    }
  }

  // Create advance reminder notification
  const prefs = db.preferences[rec.userId] || { reminderAdvanceMinutes: 15 };
  const advanceMin = prefs.reminderAdvanceMinutes || 15;
  const startTimeDate = new Date(rec.suggestedStartTime);
  const reminderDate = new Date(startTimeDate.getTime() - advanceMin * 60000);

  db.notifications.unshift({
    id: `notif_${Date.now()}`,
    userId: rec.userId,
    title: "🔔 Sắp đến giờ học AI",
    message: `Bạn có lịch tự học '${rec.taskTitle}' lúc ${startTimeDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}. Còn ${advanceMin} phút.`,
    eventId: newEvent.id,
    taskId: rec.taskId,
    scheduledFor: reminderDate.toISOString(),
    advanceMinutes: advanceMin,
    read: false,
    createdAt: new Date().toISOString(),
    type: "reminder",
  });

  saveDb();
  res.json({
    success: true,
    recommendation: rec,
    event: newEvent,
    message: "Đã áp dụng lịch học vào thời gian biểu thành công!",
  });
});

app.post("/api/ai/reject-recommendation", (req, res) => {
  const { recommendationId } = req.body;
  const recIndex = db.recommendations.findIndex((r) => r.id === recommendationId);
  if (recIndex === -1) {
    return res.status(404).json({ error: "Không tìm thấy đề xuất." });
  }
  db.recommendations[recIndex].status = "rejected";
  saveDb();
  res.json({ success: true, message: "Đã từ chối đề xuất." });
});

// 6. Notifications API
app.get("/api/notifications", (req, res) => {
  const { userId } = req.query;
  const notifs = userId ? db.notifications.filter((n) => n.userId === userId) : db.notifications;
  res.json(notifs);
});

app.put("/api/notifications/:id/read", (req, res) => {
  const { id } = req.params;
  const index = db.notifications.findIndex((n) => n.id === id);
  if (index !== -1) {
    db.notifications[index].read = true;
    saveDb();
  }
  res.json({ success: true });
});

app.post("/api/notifications/mark-all-read", (req, res) => {
  const { userId } = req.body;
  db.notifications.forEach((n) => {
    if (!userId || n.userId === userId) {
      n.read = true;
    }
  });
  saveDb();
  res.json({ success: true });
});

app.post("/api/notifications/test-trigger", (req, res) => {
  const { userId, title, message } = req.body;
  const newNotif: AppNotification = {
    id: `notif_test_${Date.now()}`,
    userId: userId || "usr_1",
    title: title || "🔔 [Test] Sắp đến giờ học",
    message: message || "Bạn có lịch 'Học AI' lúc 19:00. Còn 15 phút.",
    scheduledFor: new Date().toISOString(),
    advanceMinutes: 15,
    read: false,
    createdAt: new Date().toISOString(),
    type: "reminder",
  };
  db.notifications.unshift(newNotif);
  saveDb();
  res.json(newNotif);
});

// 7. Study History
app.get("/api/history", (req, res) => {
  const { userId } = req.query;
  const hist = userId ? db.studyHistory.filter((h) => h.userId === userId) : db.studyHistory;
  res.json(hist);
});

app.post("/api/history", (req, res) => {
  const { userId, taskTitle, durationMinutes, notes } = req.body;
  const newHist: StudyHistory = {
    id: `hist_${Date.now()}`,
    userId: userId || "usr_1",
    taskTitle,
    durationMinutes: Number(durationMinutes) || 60,
    completedAt: new Date().toISOString(),
    notes,
  };
  db.studyHistory.unshift(newHist);
  saveDb();
  res.status(201).json(newHist);
});

// 8. Reset to Default Data
app.post("/api/reset-data", (req, res) => {
  db = getInitialData();
  saveDb();
  res.json({ success: true, message: "Đã khôi phục dữ liệu mặc định thành công." });
});

// 9. API 404 handler - CRITICAL FIX for 'Unexpected token' JSON errors
// If any /api/* route was not matched above, return JSON 404 instead of HTML (Vite SPA fallback)
// This prevents frontend fetch().json() from failing with 'The page...' HTML errors
app.use("/api", (req, res) => {
  res.status(404).json({ error: `API endpoint không tồn tại: ${req.method} ${req.originalUrl}` });
});

// Global error handler for JSON parsing errors - always return JSON
app.use((err: any, req: any, res: any, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: "Dữ liệu JSON không hợp lệ." });
  }
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || "Lỗi máy chủ nội bộ." });
});

// Start Express Server with Vite middleware
async function startServer() {
  if (process.env.VERCEL) {
    // Serverless (Vercel): requests are routed to the exported Express app by
    // api/index.ts + vercel.json rewrites. There is no persistent process, so
    // we must NOT listen, create a Vite dev server or serve static files here.
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Export the Express app so serverless platforms (Vercel) can invoke it
// per-request. Locally / AI Studio / Cloud Run this export is simply unused.
export default app;

// Only boot the long-running server when NOT running on a serverless platform.
if (!process.env.VERCEL) {
  startServer();
}
