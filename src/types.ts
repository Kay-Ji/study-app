export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export type EventType = 'class' | 'work' | 'personal' | 'ai_study';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  timezone: string; // e.g. 'Asia/Ho_Chi_Minh'
  avatar?: string;
  bio?: string;
  createdAt: string;
}

export interface ScheduleEvent {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startTime: string; // UTC ISO 8601 string, e.g. "2026-09-07T00:30:00.000Z"
  endTime: string;   // UTC ISO 8601 string
  location?: string;
  type: EventType;
  priority: PriorityLevel;
  color?: string;
  isFixed: boolean; // Fixed class/work that AI cannot schedule over
  createdAt: string;
}

export type TaskCategory = 'study' | 'project' | 'exercise' | 'exam_prep' | 'work' | 'personal';

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  deadline: string; // UTC ISO 8601 string
  estimatedDuration: number; // in hours, e.g. 2, 3, 5
  priority: PriorityLevel;
  status: TaskStatus;
  category: TaskCategory;
  allocatedHours?: number; // hours already scheduled
  createdAt: string;
}

export interface UserPreferences {
  userId: string;
  preferredStartTime: string; // "19:00"
  preferredEndTime: string;   // "22:30"
  dailyMaxStudyHours: number; // 4 hours
  sessionDurationHours: number; // 1.5 - 2 hours
  breakDurationMinutes: number; // 15 mins
  reminderAdvanceMinutes: 5 | 10 | 15 | 30 | 60;
  preferredDays: number[]; // 1 = Monday, ..., 7 = Sunday
  weekendStudyAllowed: boolean;
}

export interface AIRecommendation {
  id: string;
  userId: string;
  taskId: string;
  taskTitle: string;
  suggestedStartTime: string; // UTC ISO string
  suggestedEndTime: string;   // UTC ISO string
  durationHours: number;
  score: number; // e.g. 91
  reason: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  eventId?: string;
  taskId?: string;
  scheduledFor: string; // UTC ISO string
  advanceMinutes: number;
  read: boolean;
  createdAt: string;
  type: 'reminder' | 'deadline' | 'ai_recommendation' | 'system';
}

export interface StudyHistory {
  id: string;
  userId: string;
  taskTitle: string;
  durationMinutes: number;
  completedAt: string;
  notes?: string;
}

export interface ServerTimeResponse {
  utc: string;
  timestamp: number;
  timezoneServer: string;
}

export interface RecommendScheduleRequest {
  userId: string;
  taskIds?: string[];
  daysAhead?: number;
}
