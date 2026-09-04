import React from 'react';
import {
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  MapPin,
  Flame,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatTimeInTz,
  formatDateInTz,
  getWeekdayNameInTz,
  getRemainingTimeStr,
} from '../utils/time';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    events,
    tasks,
    recommendations,
    serverTime,
    setIsAddEventOpen,
    setIsAddTaskOpen,
    setActiveTab,
    applyRecommendation,
    rejectRecommendation,
    preferences,
  } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';

  // Format today's date in user's timezone
  const todayIso = serverTime.toISOString();
  const weekdayName = getWeekdayNameInTz(todayIso, timezone);
  const todayDateStr = formatDateInTz(todayIso, timezone);
  const todayYmd = todayDateStr.split('/').reverse().join('-'); // approximate check or match date strings

  // Filter today's events (events that occur on today's calendar date in user's timezone)
  const todayEvents = events.filter((evt) => {
    const evtDateStr = formatDateInTz(evt.startTime, timezone);
    return evtDateStr === todayDateStr;
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  // Upcoming deadlines (tasks not completed, sorted by nearest deadline)
  const upcomingTasks = tasks
    .filter((t) => t.status !== 'completed')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 3);

  // Pending AI recommendations
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');

  // Greeting based on server local time hour
  const serverHourInTz = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(serverTime)
  );

  let greeting = 'Chào buổi sáng';
  if (serverHourInTz >= 12 && serverHourInTz < 18) {
    greeting = 'Chào buổi chiều';
  } else if (serverHourInTz >= 18) {
    greeting = 'Chào buổi tối';
  }

  // Calculate total scheduled hours for today
  const totalHoursToday = todayEvents.reduce((acc, curr) => {
    const start = new Date(curr.startTime).getTime();
    const end = new Date(curr.endTime).getTime();
    return acc + Math.max(0, (end - start) / 3600000);
  }, 0);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute right-12 top-6 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>AI-Powered Study & Schedule Optimizer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {greeting}, <span className="text-indigo-300">{currentUser?.name || 'Bạn'}</span>!
            </h1>
            <p className="text-slate-300 text-sm max-w-xl leading-relaxed">
              Hôm nay là <strong>{weekdayName}, {todayDateStr}</strong>. Hệ thống AI đã phân tích lịch học cố định và sẵn sàng giúp bạn tối ưu hóa thời gian tự học & deadline.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="hero-quick-add-task"
              onClick={() => setIsAddTaskOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm việc mới</span>
            </button>
            <button
              id="hero-open-ai-scheduler"
              onClick={() => setActiveTab('ai')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-indigo-200 border border-indigo-500/30 text-sm font-semibold transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Tối ưu lịch AI</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Hôm nay</span>
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-xl font-bold text-white">{todayEvents.length} <span className="text-xs font-normal text-slate-400">sự kiện</span></div>
            <div className="text-[11px] text-slate-400 mt-0.5">{totalHoursToday.toFixed(1)} giờ trên lịch</div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Việc cần làm</span>
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-amber-300">
              {tasks.filter((t) => t.status !== 'completed').length} <span className="text-xs font-normal text-slate-400">tasks</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {tasks.filter((t) => t.priority === 'urgent' || t.priority === 'high').length} ưu tiên cao
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Đề xuất AI</span>
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="text-xl font-bold text-violet-300">
              {pendingRecs.length} <span className="text-xs font-normal text-slate-400">khung giờ</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Sẵn sàng áp dụng</div>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700/50">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Giờ tự học tối ưu</span>
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-300">
              {preferences?.preferredStartTime || '19:00'} - {preferences?.preferredEndTime || '22:30'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Khung giờ vàng cá nhân</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Timeline (Matching Section 17 & 4 of Prompt) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Thời gian biểu hôm nay (Today)</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {weekdayName}, {todayDateStr} • Giờ máy chủ: {formatTimeInTz(serverTime.toISOString(), timezone, { second: '2-digit' })}
                  </p>
                </div>
              </div>

              <button
                id="add-event-today-btn"
                onClick={() => setIsAddEventOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm lịch</span>
              </button>
            </div>

            {/* Timeline Stream matching Prompt:
                07:30 AI
                09:30 -----
                14:00 Database
                16:00 -----
                19:00 Machine Learning */}
            <div className="space-y-3 relative pl-6 border-l-2 border-indigo-100 ml-3">
              {todayEvents.length === 0 ? (
                <div className="py-10 text-center text-slate-500 bg-slate-50/50 rounded-2xl p-6 border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-sm text-slate-700">Chưa có lịch nào trong ngày hôm nay</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Bạn có thể thêm lịch học cố định hoặc dùng AI Scheduler để tìm khung giờ tự học tối ưu.
                  </p>
                  <button
                    onClick={() => setActiveTab('ai')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors inline-flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Chạy AI Scheduler ngay
                  </button>
                </div>
              ) : (
                todayEvents.map((evt) => {
                  const startTimeStr = formatTimeInTz(evt.startTime, timezone);
                  const endTimeStr = formatTimeInTz(evt.endTime, timezone);
                  const isClass = evt.type === 'class';
                  const isAISchedule = evt.type === 'ai_study';

                  return (
                    <div
                      key={evt.id}
                      className={`relative p-4 rounded-2xl border transition-all ${
                        isClass
                          ? 'bg-blue-50/50 border-blue-200/80'
                          : isAISchedule
                          ? 'bg-purple-50/60 border-purple-200/80 shadow-xs'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {/* Timeline Dot */}
                      <span
                        className={`absolute -left-[31px] top-5 w-3.5 h-3.5 rounded-full border-2 border-white ring-2 ${
                          isClass ? 'bg-blue-600 ring-blue-200' : isAISchedule ? 'bg-purple-600 ring-purple-200' : 'bg-slate-600 ring-slate-200'
                        }`}
                      ></span>

                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                              {startTimeStr} — {endTimeStr}
                            </span>
                            {isClass && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                Lịch học cố định (Fixed)
                              </span>
                            )}
                            {isAISchedule && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                Tự học tối ưu bởi AI
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm">{evt.title}</h4>

                          {evt.description && (
                            <p className="text-xs text-slate-600 line-clamp-1">{evt.description}</p>
                          )}

                          {evt.location && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{evt.location}</span>
                            </div>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              evt.priority === 'urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : evt.priority === 'high'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {evt.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Hệ thống áp dụng múi giờ: <strong className="text-slate-800">{timezone}</strong></span>
              <button
                onClick={() => setActiveTab('calendar')}
                className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
              >
                <span>Xem toàn bộ tuần & tháng</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* AI Active Recommendations Spotlight */}
          {pendingRecs.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-white rounded-3xl p-6 border border-indigo-200/80 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      🤖 AI Đề xuất thay đổi & tối ưu lịch
                    </h3>
                    <p className="text-xs text-slate-500">
                      Không tự ý đổi lịch — Người dùng toàn quyền Phê duyệt (UX tối ưu)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('ai')}
                  className="text-xs font-semibold text-indigo-700 hover:underline"
                >
                  Xem tất cả ({pendingRecs.length})
                </button>
              </div>

              <div className="space-y-3">
                {pendingRecs.slice(0, 2).map((rec) => {
                  const startStr = formatTimeInTz(rec.suggestedStartTime, timezone);
                  const endStr = formatTimeInTz(rec.suggestedEndTime, timezone);
                  const weekday = getWeekdayNameInTz(rec.suggestedStartTime, timezone);
                  const dateStr = formatDateInTz(rec.suggestedStartTime, timezone);

                  return (
                    <div
                      key={rec.id}
                      className="bg-white rounded-2xl p-4 border border-indigo-100 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-slate-900 text-sm">{rec.taskTitle}</span>
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              Độ phù hợp: {rec.score}/100
                            </span>
                          </div>
                          <p className="text-xs text-indigo-950 font-medium">
                            📅 Khung đề xuất: <strong>{weekday}, {dateStr} ({startStr} - {endStr})</strong> ({rec.durationHours} giờ)
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 leading-relaxed border border-slate-100">
                        <p className="italic">"{rec.reason}"</p>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          onClick={() => rejectRecommendation(rec.id)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => applyRecommendation(rec.id)}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Áp dụng vào lịch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Urgent Tasks & Deadlines */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Deadlines sắp tới</h3>
                  <p className="text-xs text-slate-500">Ưu tiên xử lý trước</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddTaskOpen(true)}
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold"
              >
                + Thêm
              </button>
            </div>

            <div className="space-y-3">
              {upcomingTasks.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Tuyệt vời! Không có deadline nào đang chờ.
                </div>
              ) : (
                upcomingTasks.map((t) => {
                  const remaining = getRemainingTimeStr(t.deadline);
                  return (
                    <div
                      key={t.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-xs text-slate-900 line-clamp-1">{t.title}</h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            t.priority === 'urgent'
                              ? 'bg-rose-100 text-rose-700'
                              : t.priority === 'high'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Dự tính: {t.estimatedDuration}h</span>
                        </span>
                        <span
                          className={`font-semibold ${
                            remaining.isUrgent ? 'text-rose-600' : 'text-slate-600'
                          }`}
                        >
                          {remaining.text}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(((t.allocatedHours || 0) / t.estimatedDuration) * 100)
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setActiveTab('tasks')}
              className="w-full mt-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors text-center"
            >
              Xem tất cả nhiệm vụ ({tasks.length})
            </button>
          </div>

          {/* Quick Notification Testing Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
              <Clock className="w-4 h-4" />
              <span>THÔNG BÁO THỜI GIAN THỰC</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Mô phỏng điện thoại nhận thông báo đẩy trước ca học <strong>{preferences?.reminderAdvanceMinutes || 15} phút</strong>.
            </p>
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-xs space-y-1">
              <div className="font-semibold text-slate-200">🔔 Sắp đến giờ học</div>
              <p className="text-[11px] text-slate-400">
                Bạn có lịch "Học AI" lúc 19:00. Còn {preferences?.reminderAdvanceMinutes || 15} phút.
              </p>
            </div>
            <button
              id="home-view-notifications-btn"
              onClick={() => setActiveTab('notifications')}
              className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Mở Trình mô phỏng Thông báo →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
