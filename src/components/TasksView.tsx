import React, { useState } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Trash2,
  Filter,
  BarChart2,
  Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatDateInTz, formatTimeInTz, getRemainingTimeStr } from '../utils/time';
import { TaskItem, TaskStatus, PriorityLevel } from '../types';

export const TasksView: React.FC = () => {
  const {
    tasks,
    currentUser,
    setIsAddTaskOpen,
    updateTask,
    deleteTask,
    setActiveTab,
    runAIScheduler,
    isGeneratingAI,
  } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    return true;
  }).sort((a, b) => {
    // Pending/In-progress first, then nearest deadline
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const handleStatusChange = (task: TaskItem, newStatus: TaskStatus) => {
    updateTask(task.id, { status: newStatus });
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản lý Nhiệm vụ & Deadlines</h2>
            <p className="text-xs text-slate-500 font-medium">
              Định lượng thời gian cần thiết (Estimated duration) & mức độ ưu tiên để AI phân bổ lịch
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-ai-from-tasks-btn"
            onClick={async () => {
              setActiveTab('ai');
              await runAIScheduler();
            }}
            disabled={isGeneratingAI}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Tối ưu hóa nhiệm vụ</span>
          </button>
          <button
            id="add-task-open-modal-btn"
            onClick={() => setIsAddTaskOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm công việc</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'in_progress' ? 'bg-white text-indigo-700 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Đang thực hiện ({tasks.filter((t) => t.status === 'in_progress').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'pending' ? 'bg-white text-amber-700 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Chờ xử lý ({tasks.filter((t) => t.status === 'pending').length})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              statusFilter === 'completed' ? 'bg-white text-emerald-700 font-bold shadow-xs' : 'text-slate-600'
            }`}
          >
            Đã xong ({tasks.filter((t) => t.status === 'completed').length})
          </button>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-medium">Mức độ ưu tiên:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">Tất cả ưu tiên</option>
            <option value="urgent">Khẩn cấp (Urgent)</option>
            <option value="high">Cao (High)</option>
            <option value="medium">Trung bình (Medium)</option>
            <option value="low">Thấp (Low)</option>
          </select>
        </div>
      </div>

      {/* Task List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTasks.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-700 text-sm">Không tìm thấy công việc nào phù hợp</p>
            <button
              onClick={() => setIsAddTaskOpen(true)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors"
            >
              + Tạo công việc đầu tiên
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const remaining = getRemainingTimeStr(task.deadline);
            const isCompleted = task.status === 'completed';
            const allocated = task.allocatedHours || 0;
            const progressPercent = Math.min(100, Math.round((allocated / task.estimatedDuration) * 100));

            return (
              <div
                key={task.id}
                className={`bg-white rounded-3xl p-5 border transition-all space-y-3 shadow-xs hover:shadow-md ${
                  isCompleted
                    ? 'border-slate-200 bg-slate-50/40 opacity-75'
                    : task.priority === 'urgent'
                    ? 'border-rose-200'
                    : 'border-slate-200/80'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() =>
                        handleStatusChange(task, isCompleted ? 'pending' : 'completed')
                      }
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-indigo-600 bg-white'
                      }`}
                      title={isCompleted ? 'Đánh dấu chưa xong' : 'Đánh dấu hoàn thành'}
                    >
                      {isCompleted && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <div>
                      <h4
                        className={`font-bold text-sm text-slate-900 ${
                          isCompleted ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        task.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : task.priority === 'high'
                          ? 'bg-amber-100 text-amber-700'
                          : task.priority === 'medium'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors rounded-lg"
                      title="Xóa công việc"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Deadline & Duration badges */}
                <div className="bg-slate-50 rounded-2xl p-3 text-xs space-y-2 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Hạn chót: <strong>{formatDateInTz(task.deadline, timezone)} ({formatTimeInTz(task.deadline, timezone)})</strong></span>
                    </span>
                    <span
                      className={`font-bold ${
                        remaining.isOverdue
                          ? 'text-rose-600'
                          : remaining.isUrgent
                          ? 'text-amber-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {remaining.text}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Thời lượng cần: <strong>{task.estimatedDuration} giờ</strong></span>
                    </span>
                    <span>Đã phân bổ lịch: <strong>{allocated} giờ ({progressPercent}%)</strong></span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        progressPercent >= 100
                          ? 'bg-emerald-500'
                          : progressPercent > 0
                          ? 'bg-indigo-600'
                          : 'bg-transparent'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Card footer with AI Assistant trigger */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        task.status === 'completed'
                          ? 'bg-emerald-500'
                          : task.status === 'in_progress'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                    ></span>
                    <span className="capitalize text-slate-500 font-medium">
                      {task.status === 'completed'
                        ? 'Đã hoàn thành'
                        : task.status === 'in_progress'
                        ? 'Đang thực hiện'
                        : 'Chờ phân bổ'}
                    </span>
                  </div>

                  {!isCompleted && (
                    <button
                      onClick={() => setActiveTab('ai')}
                      className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Xếp giờ tự học với AI →</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
