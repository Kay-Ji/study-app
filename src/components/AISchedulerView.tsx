import React, { useState } from 'react';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertTriangle,
  Sliders,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  ArrowRight,
  Info,
  Check,
  RotateCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  formatTimeInTz,
  formatDateInTz,
  getWeekdayNameInTz,
  getRemainingTimeStr,
} from '../utils/time';

export const AISchedulerView: React.FC = () => {
  const {
    currentUser,
    tasks,
    events,
    recommendations,
    preferences,
    updatePreferences,
    runAIScheduler,
    applyRecommendation,
    rejectRecommendation,
    isGeneratingAI,
    setActiveTab,
  } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const pendingRecs = recommendations.filter((r) => r.status === 'pending');
  const appliedRecs = recommendations.filter((r) => r.status === 'applied');

  const handleRunOptimizer = async () => {
    const res = await runAIScheduler();
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  const handleApply = async (id: string) => {
    const ok = await applyRecommendation(id);
    if (ok) {
      setFeedbackMessage('Đã thêm lịch học vào Thời gian biểu thành công!');
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleReject = async (id: string) => {
    await rejectRecommendation(id);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header with AI Scheduler Philosophy */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-violet-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-700/40 relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-400/30">
            <BrainCircuit className="w-3.5 h-3.5 text-amber-300" />
            <span>Hệ thống Tối ưu hóa Lịch trình Cá nhân hóa (AI Scheduler)</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            AI Schedule Assistant
          </h2>

          <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
            Kết hợp <strong>Machine Learning Slot Scoring</strong>, <strong>Constraint Optimization</strong> và <strong>Gemini AI</strong> để tự động tìm khoảng thời gian rảnh tối ưu nhất mà không bao giờ xếp đè lên các tiết học cố định trên trường.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              id="run-ai-scheduler-primary-btn"
              onClick={handleRunOptimizer}
              disabled={isGeneratingAI || pendingTasks.length === 0}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGeneratingAI ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Đang phân tích & tối ưu...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-slate-950" />
                  <span>Chạy AI Scheduler & Tối ưu hóa</span>
                </>
              )}
            </button>

            <div className="text-xs text-indigo-200 font-medium">
              Hiện có <strong>{pendingTasks.length} nhiệm vụ</strong> đang chờ phân bổ.
            </div>
          </div>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between animate-in slide-in-from-top-1">
          <span>{feedbackMessage}</span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            ✕
          </button>
        </div>
      )}

      {/* 3-Level Architecture Explanation & Constraints (Section 6 & 7 of prompt) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
            <span className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-xs">1</span>
            <span>RÀNG BUỘC CỐ ĐỊNH (Hard Constraints)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tuyệt đối <strong>không xếp đè</strong> lên lịch học trên trường ({events.filter(e => e.type === 'class').length} môn cố định). Đảm bảo hoàn thành trước deadline.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-violet-700 text-xs font-bold">
            <span className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center text-xs">2</span>
            <span>CHẤM ĐIỂM KHOẢNG THỜI GIAN (Slot Scoring)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Thuật toán tính điểm 0-100 dựa trên: <strong>Độ gấp deadline + Mức độ ưu tiên + Thói quen khung giờ tối + Tránh quá tải liên tục</strong>.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold">
            <span className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center text-xs">3</span>
            <span>QUYỀN PHÊ DUYỆT CỦA BẠN (Human In The Loop)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            AI đưa ra đề xuất kèm lý do chi tiết. Chỉ khi bạn bấm <strong>[Áp dụng lịch]</strong> thì lịch mới được ghi vào thời gian biểu và thiết lập báo giờ.
          </p>
        </div>
      </div>

      {/* Main Grid: Pending Recommendations + Preferences Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Recommendations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>Đề xuất Lịch học Tối ưu ({pendingRecs.length} đề xuất mới)</span>
            </h3>
            {pendingRecs.length > 0 && (
              <button
                onClick={async () => {
                  for (const r of pendingRecs) {
                    await applyRecommendation(r.id);
                  }
                  setFeedbackMessage('Đã áp dụng toàn bộ đề xuất vào lịch biểu!');
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                Áp dụng tất cả ({pendingRecs.length})
              </button>
            )}
          </div>

          {pendingRecs.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-3">
              <BrainCircuit className="w-12 h-12 mx-auto text-slate-300" />
              <h4 className="font-bold text-sm text-slate-800">Không có đề xuất nào đang chờ</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bấm nút "Chạy AI Scheduler & Tối ưu hóa" ở trên để hệ thống quét các bài tập đang chờ và tạo thời gian biểu thông minh cho tuần này.
              </p>
              <button
                onClick={handleRunOptimizer}
                disabled={isGeneratingAI}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500 transition-colors inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Quét & Tạo đề xuất ngay
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRecs.map((rec) => {
                const startStr = formatTimeInTz(rec.suggestedStartTime, timezone);
                const endStr = formatTimeInTz(rec.suggestedEndTime, timezone);
                const weekday = getWeekdayNameInTz(rec.suggestedStartTime, timezone);
                const dateStr = formatDateInTz(rec.suggestedStartTime, timezone);

                return (
                  <div
                    key={rec.id}
                    className="bg-white rounded-3xl p-6 border border-indigo-100 shadow-sm space-y-4 hover:border-indigo-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-base text-slate-900">{rec.taskTitle}</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-emerald-600" />
                            Score: {rec.score}/100
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thời lượng đề xuất: <strong>{rec.durationHours} giờ</strong>
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="inline-block font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                          {weekday}, {dateStr} • {startStr} - {endStr}
                        </span>
                      </div>
                    </div>

                    {/* AI Reasoning Box */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 text-xs text-slate-700 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-indigo-600 font-semibold text-[11px]">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>GIẢI THÍCH LÝ DO TỐI ƯU CỦA AI:</span>
                      </div>
                      <p className="leading-relaxed italic text-slate-800 font-medium">
                        "{rec.reason}"
                      </p>
                    </div>

                    {/* User Action Buttons (Matching Section 15 UX) */}
                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button
                        onClick={() => handleReject(rec.id)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4 text-slate-400" />
                        <span>Từ chối</span>
                      </button>
                      <button
                        onClick={() => handleApply(rec.id)}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Áp dụng lịch</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Applied Recommendations History */}
          {appliedRecs.length > 0 && (
            <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
              <h4 className="font-bold text-sm text-slate-800">
                Đã phê duyệt & thêm vào lịch ({appliedRecs.length})
              </h4>
              <div className="space-y-2">
                {appliedRecs.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-slate-800">{r.taskTitle}</span>
                      <span className="text-slate-500">({r.durationHours}h)</span>
                    </div>
                    <span className="text-emerald-700 font-semibold">Đã lên lịch</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: AI Tuning Parameters (User Preferences) */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Thông số Tối ưu Cá nhân</h3>
                <p className="text-[11px] text-slate-500">Cấu hình cho thuật toán AI</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Khung giờ tự học ưu tiên (Tối):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={preferences?.preferredStartTime || '19:00'}
                    onChange={(e) => updatePreferences({ preferredStartTime: e.target.value })}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
                  />
                  <input
                    type="time"
                    value={preferences?.preferredEndTime || '22:30'}
                    onChange={(e) => updatePreferences({ preferredEndTime: e.target.value })}
                    className="p-2 rounded-xl border border-slate-200 bg-slate-50 font-mono text-center"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  AI sẽ ưu tiên tìm slot trống trong khoảng giờ này
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Thời lượng mỗi ca học:
                </label>
                <select
                  value={preferences?.sessionDurationHours || 1.5}
                  onChange={(e) => updatePreferences({ sessionDurationHours: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value={1}>1.0 giờ (Học tập trung ngắn)</option>
                  <option value={1.5}>1.5 giờ (Khuyên dùng - Pomodoro 3x30)</option>
                  <option value={2}>2.0 giờ (Bài tập lớn / Đồ án)</option>
                  <option value={2.5}>2.5 giờ (Tập trung chuyên sâu)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Giới hạn tự học tối đa / ngày:
                </label>
                <select
                  value={preferences?.dailyMaxStudyHours || 4}
                  onChange={(e) => updatePreferences({ dailyMaxStudyHours: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value={2}>2 giờ / ngày</option>
                  <option value={3}>3 giờ / ngày</option>
                  <option value={4}>4 giờ / ngày (Chuẩn sinh viên)</option>
                  <option value={6}>6 giờ / ngày (Mùa ôn thi cao điểm)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  AI sẽ ngăn chặn xếp quá nhiều việc liên tục gây quá tải
                </p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Thời gian nghỉ giải lao:
                </label>
                <select
                  value={preferences?.breakDurationMinutes || 15}
                  onChange={(e) => updatePreferences({ breakDurationMinutes: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                >
                  <option value={10}>10 phút</option>
                  <option value={15}>15 phút (Khuyên dùng)</option>
                  <option value={20}>20 phút</option>
                  <option value={30}>30 phút</option>
                </select>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={handleRunOptimizer}
                  disabled={isGeneratingAI}
                  className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-colors text-center"
                >
                  Lưu & Chạy lại Optimizer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
