import React, { useEffect, useState } from 'react';
import { X, CheckSquare } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { localToUtcIso, getLocalYmdInTz } from '../utils/time';
import { PriorityLevel, TaskCategory } from '../types';

// Compute YYYY-MM-DD for the day that is `offsetDays` from today in the user's timezone.
const dateInTz = (serverTime: Date, timezone: string, offsetDays: number = 0): string => {
  const base = getLocalYmdInTz(serverTime.toISOString(), timezone);
  if (!base) {
    const n = new Date(serverTime.getTime() + offsetDays * 86400000);
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }
  const [y, m, d] = base.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + offsetDays));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, '0')}-${String(utc.getUTCDate()).padStart(2, '0')}`;
};

type FormState = {
  title: string;
  description: string;
  estimatedDuration: number;
  deadlineDate: string;
  deadlineTime: string;
  priority: PriorityLevel;
  category: TaskCategory;
};

const initialForm = (serverTime: Date, timezone: string): FormState => ({
  title: '',
  description: '',
  estimatedDuration: 3,
  deadlineDate: dateInTz(serverTime, timezone, 3),
  deadlineTime: '23:59',
  priority: 'high',
  category: 'project',
});

export const AddTaskModal: React.FC = () => {
  const { isAddTaskOpen, setIsAddTaskOpen, createTask, currentUser, serverTime } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';

  const [form, setForm] = useState<FormState>(() => initialForm(serverTime, timezone));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAddTaskOpen) {
      setForm(initialForm(serverTime, timezone));
      setIsSubmitting(false);
    }
  }, [isAddTaskOpen, serverTime, timezone]);

  if (!isAddTaskOpen) return null;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const { title, description, estimatedDuration, deadlineDate, deadlineTime, priority, category } = form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const deadlineUtcIso = localToUtcIso(deadlineDate, deadlineTime, timezone);

    const ok = await createTask({
      title: title.trim(),
      description: description.trim(),
      estimatedDuration: Number(estimatedDuration),
      deadline: deadlineUtcIso,
      priority,
      category,
      status: 'pending',
      allocatedHours: 0,
    });

    setIsSubmitting(false);
    if (ok) {
      setIsAddTaskOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Thêm nhiệm vụ & Hạn chót (Deadline)</h3>
              <p className="text-[11px] text-slate-500">AI Scheduler sẽ dựa vào thông tin này để tự động phân bổ lịch</p>
            </div>
          </div>
          <button
            onClick={() => setIsAddTaskOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên công việc / Bài tập:</label>
            <input
              type="text"
              required
              placeholder="VD: Làm đồ án AI, Học Machine Learning, Bài tập Toán..."
              value={title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thời lượng cần (Giờ):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0.5}
                  max={40}
                  step={0.5}
                  required
                  value={estimatedDuration}
                  onChange={(e) => set('estimatedDuration', Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-900"
                />
                <span className="text-slate-500 font-medium shrink-0">tiếng</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mức độ ưu tiên:</label>
              <select
                value={priority}
                onChange={(e) => set('priority', e.target.value as PriorityLevel)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
              >
                <option value="urgent">Khẩn cấp (Urgent - Ưu tiên số 1)</option>
                <option value="high">Cao (High - Xếp lịch sớm)</option>
                <option value="medium">Trung bình (Medium)</option>
                <option value="low">Thấp (Low)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hạn chót (Ngày):</label>
              <input
                type="date"
                required
                value={deadlineDate}
                onChange={(e) => set('deadlineDate', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Giờ hết hạn:</label>
              <input
                type="time"
                required
                value={deadlineTime}
                onChange={(e) => set('deadlineTime', e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Danh mục (Category):</label>
              <select
                value={category}
                onChange={(e) => set('category', e.target.value as TaskCategory)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="project">Đồ án / Dự án</option>
                <option value="study">Tự học lý thuyết</option>
                <option value="exercise">Bài tập về nhà</option>
                <option value="exam_prep">Ôn thi</option>
                <option value="work">Công việc làm thêm</option>
                <option value="personal">Cá nhân</option>
              </select>
            </div>

            <div className="flex items-end">
              <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/80 text-[11px] text-amber-900 leading-tight">
                💡 AI sẽ ưu tiên những công việc có deadline gần nhất và mức độ ưu tiên cao.
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Mô tả công việc:</label>
            <textarea
              rows={2}
              placeholder="Yêu cầu cụ thể, tài liệu tham khảo..."
              value={description}
              onChange={(e) => set('description', e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddTaskOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu công việc'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
