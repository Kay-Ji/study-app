import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Trash2,
  Filter,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatTimeInTz,
  formatDateInTz,
  getWeekdayNameInTz,
} from '../utils/time';
import { ScheduleEvent } from '../types';

export const CalendarView: React.FC = () => {
  const {
    events,
    currentUser,
    serverTime,
    setIsAddEventOpen,
    deleteEvent,
    preferences,
  } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedDateOffset, setSelectedDateOffset] = useState<number>(0); // in weeks or days
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  // Compute start of current week (Monday)
  const currentWeekDays = useMemo(() => {
    // Current server time in user timezone
    const now = new Date(serverTime.getTime() + selectedDateOffset * 7 * 86400000);
    const dayOfWeek = now.getUTCDay(); // 0 = Sun, 1 = Mon ...
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() + distToMon);
    monday.setUTCHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const dayCodes = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const isoStr = d.toISOString();
      days.push({
        date: d,
        isoStr,
        dayName: dayNames[i],
        dayCode: dayCodes[i],
        dateFormatted: formatDateInTz(isoStr, timezone),
        isToday: formatDateInTz(isoStr, timezone) === formatDateInTz(serverTime.toISOString(), timezone),
      });
    }
    return days;
  }, [serverTime, selectedDateOffset, timezone]);

  // Check for any schedule conflicts across all events
  const conflicts = useMemo(() => {
    const conflictList: { evt1: ScheduleEvent; evt2: ScheduleEvent }[] = [];
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const e1 = events[i];
        const e2 = events[j];
        const start1 = new Date(e1.startTime).getTime();
        const end1 = new Date(e1.endTime).getTime();
        const start2 = new Date(e2.startTime).getTime();
        const end2 = new Date(e2.endTime).getTime();

        if (start1 < end2 && end1 > start2) {
          conflictList.push({ evt1: e1, evt2: e2 });
        }
      }
    }
    return conflictList;
  }, [events]);

  // Filter events based on type
  const filteredEvents = useMemo(() => {
    if (typeFilter === 'all') return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  // Hours for Day / Week view grid
  const timeHours = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
    '19:00', '20:00', '21:00', '22:00'
  ];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <CalendarIcon className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Thời gian biểu & Lịch học</h2>
              <p className="text-xs text-slate-500 font-medium">
                Quản lý lịch học cố định & các ca tự học do AI phân bổ • Múi giờ: {timezone}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View mode switcher */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'day' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ngày
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'week' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'month' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tháng
            </button>
          </div>

          {/* Week pagination */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedDateOffset((prev) => prev - 1)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Tuần trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSelectedDateOffset(0)}
              className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-white rounded-lg transition-colors"
            >
              Hôm nay
            </button>
            <button
              onClick={() => setSelectedDateOffset((prev) => prev + 1)}
              className="p-1.5 rounded-lg hover:bg-white text-slate-600 hover:text-slate-900 transition-colors"
              title="Tuần sau"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Add event button */}
          <button
            id="calendar-add-event-btn"
            onClick={() => setIsAddEventOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm lịch mới</span>
          </button>
        </div>
      </div>

      {/* Conflict Warning Banner if any overlap */}
      {conflicts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-3 text-rose-800 text-xs animate-in slide-in-from-top-1">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm text-rose-900 mb-1">
              Phát hiện {conflicts.length} xung đột trùng lịch!
            </h4>
            <ul className="list-disc list-inside space-y-1 text-rose-700">
              {conflicts.map((c, idx) => (
                <li key={idx}>
                  Sự kiện <strong>"{c.evt1.title}"</strong> trùng giờ với <strong>"{c.evt2.title}"</strong>. Hãy kiểm tra hoặc để AI Scheduler tự động điều chỉnh.
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Filter Tabs & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Lọc theo:</span>
          {['all', 'class', 'ai_study', 'work', 'personal'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl capitalize font-medium transition-all ${
                typeFilter === type
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {type === 'all'
                ? 'Tất cả'
                : type === 'class'
                ? 'Lớp học cố định'
                : type === 'ai_study'
                ? 'Ca tự học AI'
                : type === 'work'
                ? 'Công việc'
                : 'Cá nhân'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-blue-500"></span>
            <span>Lịch cố định (Không xếp đè)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-500"></span>
            <span>AI Đề xuất</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500"></span>
            <span>Khác</span>
          </div>
        </div>
      </div>

      {/* Week Grid (MON TUE WED THU FRI SAT SUN) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs">
          {currentWeekDays.map((day) => (
            <div
              key={day.isoStr}
              className={`py-3.5 px-2 border-r last:border-r-0 border-slate-200 ${
                day.isToday ? 'bg-indigo-50/60 font-bold text-indigo-900' : 'text-slate-700'
              }`}
            >
              <div className="font-extrabold text-[11px] uppercase tracking-wider text-slate-500">
                {day.dayCode}
              </div>
              <div className="text-sm font-bold mt-0.5">{day.dayName}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{day.dateFormatted.slice(0, 5)}</div>
              {day.isToday && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
                  HÔM NAY
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Day Columns */}
        <div className="grid grid-cols-7 divide-x divide-slate-200 min-h-[520px]">
          {currentWeekDays.map((day) => {
            // Find all events occurring on this day
            const dayEvents = filteredEvents.filter((e) => {
              const eDateStr = formatDateInTz(e.startTime, timezone);
              return eDateStr === day.dateFormatted;
            }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

            return (
              <div
                key={day.isoStr}
                className={`p-2 space-y-2 relative transition-colors ${
                  day.isToday ? 'bg-indigo-50/20' : 'bg-white hover:bg-slate-50/40'
                }`}
              >
                {dayEvents.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-2 text-slate-300">
                    <span className="text-xs">Trống</span>
                  </div>
                ) : (
                  dayEvents.map((evt) => {
                    const startStr = formatTimeInTz(evt.startTime, timezone);
                    const endStr = formatTimeInTz(evt.endTime, timezone);
                    const isFixedClass = evt.type === 'class';
                    const isAISchedule = evt.type === 'ai_study';

                    return (
                      <div
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-xs hover:shadow-md transition-all relative group ${
                          isFixedClass
                            ? 'bg-blue-50 border-blue-200 text-blue-950'
                            : isAISchedule
                            ? 'bg-purple-50 border-purple-200 text-purple-950'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/80 border border-slate-200/60">
                            {startStr} - {endStr}
                          </span>
                          {isFixedClass ? (
                            <span title="Lịch cố định - AI không được xếp đè">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            </span>
                          ) : isAISchedule ? (
                            <span title="Lịch do AI đề xuất">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            </span>
                          ) : null}
                        </div>

                        <h5 className="font-bold text-xs line-clamp-2 leading-tight">
                          {evt.title}
                        </h5>

                        {evt.location && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{evt.location}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Drawer/Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    selectedEvent.type === 'class'
                      ? 'bg-blue-100 text-blue-800'
                      : selectedEvent.type === 'ai_study'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {selectedEvent.type === 'class'
                    ? 'Lớp học cố định (Fixed)'
                    : selectedEvent.type === 'ai_study'
                    ? 'Ca tự học do AI xếp'
                    : 'Sự kiện'}
                </span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">{selectedEvent.title}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>
                  Thời gian: <strong>{formatTimeInTz(selectedEvent.startTime, timezone)} — {formatTimeInTz(selectedEvent.endTime, timezone)}</strong> ({formatDateInTz(selectedEvent.startTime, timezone)})
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Địa điểm: <strong>{selectedEvent.location}</strong></span>
                </div>
              )}
              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-200 text-slate-600 leading-relaxed">
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  deleteEvent(selectedEvent.id);
                  setSelectedEvent(null);
                }}
                className="px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa sự kiện</span>
              </button>
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
