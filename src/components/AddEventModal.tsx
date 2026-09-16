import React, { useEffect, useState } from 'react';
import { X, Calendar, MapPin, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { localToUtcIso, getLocalYmdInTz } from '../utils/time';
import { EventType, PriorityLevel } from '../types';

// Helper: get YYYY-MM-DD for current moment in the user's timezone.
const todayInTz = (serverTime: Date, timezone: string): string => {
  return (
    getLocalYmdInTz(serverTime.toISOString(), timezone) ||
    (() => {
      const n = new Date(serverTime);
      return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    })()
  );
};

type FormState = {
  title: string;
  description: string;
  dateStr: string;
  startTimeStr: string;
  endTimeStr: string;
  location: string;
  type: EventType;
  priority: PriorityLevel;
};

const initialForm = (serverTime: Date, timezone: string): FormState => ({
  title: '',
  description: '',
  dateStr: todayInTz(serverTime, timezone),
  startTimeStr: '08:00',
  endTimeStr: '10:00',
  location: '',
  type: 'class',
  priority: 'high',
});

export const AddEventModal: React.FC = () => {
  const { isAddEventOpen, setIsAddEventOpen, createEvent, currentUser, serverTime } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';

  const [form, setForm] = useState<FormState>(() => initialForm(serverTime, timezone));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset the form every time the modal opens so stale values don't leak across uses.
  useEffect(() => {
    if (isAddEventOpen) {
      setForm(initialForm(serverTime, timezone));
      setIsSubmitting(false);
    }
    // IMPORTANT: reset ONLY when the modal opens. serverTime must NOT be in
    // the dependency list — it ticks every second and would wipe the form
    // (including the title being typed) every second.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddEventOpen]);

  if (!isAddEventOpen) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const { title, description, dateStr, startTimeStr, endTimeStr, location, type, priority } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: end time must be strictly after start time.
    const [sh, sm] = startTimeStr.split(':').map(Number);
    const [eh, em] = endTimeStr.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      alert('Giờ kết thúc phải sau giờ bắt đầu.');
      return;
    }

    setIsSubmitting(true);
    const startUtcIso = localToUtcIso(dateStr, startTimeStr, timezone);
    const endUtcIso = localToUtcIso(dateStr, endTimeStr, timezone);

    const success = await createEvent({
      title: title.trim(),
      description: description.trim(),
      startTime: startUtcIso,
      endTime: endUtcIso,
      location: location.trim(),
      type,
      priority,
      isFixed: type === 'class',
    });

    setIsSubmitting(false);
    if (success) {
      setIsAddEventOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Calendar className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Thêm sự kiện vào Thời gian biểu</h3>
          </div>
          <button
            onClick={() => setIsAddEventOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Loại sự kiện:</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => set('type', 'class')}
                className={`p-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'class'
                    ? 'bg-blue-50 border-blue-500 text-blue-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Lớp học cố định</span>
              </button>

              <button
                type="button"
                onClick={() => set('type', 'ai_study')}
                className={`p-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'ai_study'
                    ? 'bg-purple-50 border-purple-500 text-purple-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>Tự học</span>
              </button>

              <button
                type="button"
                onClick={() => set('type', 'work')}
                className={`p-2.5 rounded-xl border font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  type === 'work'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>Công việc / Khác</span>
              </button>
            </div>
            {type === 'class' && (
              <p className="text-[11px] text-blue-700 mt-1 font-medium">
                🔒 Đây là sự kiện cố định. Thuật toán AI sẽ không bao giờ được xếp đè lịch tự học lên khung giờ này.
              </p>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên môn học / Sự kiện:</label>
            <input
              type="text"
              required
              placeholder="VD: Lập trình Python, AI, Cơ sở dữ liệu..."
              value={title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày (Date):</label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => set('dateStr', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Bắt đầu:</label>
              <input
                type="time"
                required
                value={startTimeStr}
                onChange={(e) => set('startTimeStr', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kết thúc:</label>
              <input
                type="time"
                required
                value={endTimeStr}
                onChange={(e) => set('endTimeStr', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Địa điểm / Phòng học:</label>
              <input
                type="text"
                placeholder="VD: Phòng A203, Online..."
                value={location}
                onChange={(e) => set('location', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mức độ ưu tiên:</label>
              <select
                value={priority}
                onChange={(e) => set('priority', e.target.value as PriorityLevel)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
              >
                <option value="urgent">Khẩn cấp (Urgent)</option>
                <option value="high">Cao (High)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="low">Thấp (Low)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú thêm:</label>
            <textarea
              rows={2}
              placeholder="Ghi chú nội dung, giảng viên..."
              value={description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddEventOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? 'Đang lưu...' : 'Thêm vào Lịch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
