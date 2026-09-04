import React, { useState } from 'react';
import {
  Bell,
  Smartphone,
  Clock,
  CheckCircle2,
  Volume2,
  Sparkles,
  Send,
  Calendar,
  Globe,
  Radio,
  Check,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatTimeInTz, formatDateInTz } from '../utils/time';

export const NotificationCenterView: React.FC = () => {
  const {
    currentUser,
    notifications,
    preferences,
    updatePreferences,
    serverTime,
    triggerTestNotification,
    markNotificationRead,
    markAllNotificationsRead,
    setActiveTab,
  } = useApp();

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const advanceMinutes = preferences?.reminderAdvanceMinutes || 15;

  const [customTitle, setCustomTitle] = useState('🔔 Sắp đến giờ học');
  const [customMsg, setCustomMsg] = useState("Bạn có lịch 'Học AI' lúc 19:00. Còn 15 phút.");
  const [isSentEffect, setIsSentEffect] = useState(false);

  const handleFireTest = async () => {
    setIsSentEffect(true);
    await triggerTestNotification(customTitle, customMsg);
    setTimeout(() => setIsSentEffect(false), 2000);
  };

  const advanceOptions = [5, 10, 15, 30, 60];

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Hệ thống Thông báo Thời gian thực (Real-Time Push)
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Kiến trúc chuẩn UTC đa múi giờ kết hợp Trình mô phỏng điện thoại di động
            </p>
          </div>
        </div>

        <button
          id="notif-mark-all-read-btn"
          onClick={markAllNotificationsRead}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
        >
          Đánh dấu đã đọc tất cả
        </button>
      </div>

      {/* UTC Timing & Architecture Explanation Card (Section 4.1 of prompt) */}
      <div className="bg-slate-900 text-slate-200 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          <span>Kiến trúc đồng bộ thời gian (Time Architecture Workflow)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-1.5">
            <div className="text-indigo-300 font-bold flex items-center gap-1.5">
              <span>1. Lưu trữ chuẩn UTC</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Mọi mốc thời gian lưu trong Database đều ở dạng <strong>ISO UTC</strong> (ví dụ: 12:00 UTC).
            </p>
            <div className="font-mono text-[11px] text-emerald-400 bg-slate-950/70 p-2 rounded-lg">
              UTC: {serverTime.toISOString().substring(11, 19)}
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-1.5">
            <div className="text-amber-300 font-bold flex items-center gap-1.5">
              <span>2. Kích hoạt thông báo trước</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Server tự động tính toán thời điểm gửi trước <strong>{advanceMinutes} phút</strong> (tương đương 11:45 UTC).
            </p>
            <div className="font-mono text-[11px] text-amber-300 bg-slate-950/70 p-2 rounded-lg">
              Offset: -{advanceMinutes} mins
            </div>
          </div>

          <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-1.5">
            <div className="text-emerald-300 font-bold flex items-center gap-1.5">
              <span>3. Chuyển đổi Timezone Client</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Người dùng tại <strong>{timezone}</strong> nhận thông báo đúng lúc (18:45) kèm rung & chuông điện thoại.
            </p>
            <div className="font-mono text-[11px] text-cyan-300 bg-slate-950/70 p-2 rounded-lg">
              Local: {formatTimeInTz(serverTime.toISOString(), timezone, { second: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: Left = Mobile Push Simulator, Right = Reminder Settings & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Interactive Smartphone Mockup */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">Mô phỏng Điện thoại Di động</h3>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Live Simulator
              </span>
            </div>

            {/* Smartphone Graphic Canvas */}
            <div className="mx-auto max-w-[300px] bg-slate-950 rounded-[44px] p-3.5 shadow-2xl border-4 border-slate-800 relative">
              {/* Dynamic Island / Notch */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-900 mr-2"></span>
                <span className="w-2 h-2 rounded-full bg-indigo-950"></span>
              </div>

              {/* Phone Screen */}
              <div className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 rounded-[34px] p-4 text-white min-h-[440px] flex flex-col justify-between relative overflow-hidden">
                {/* Status Bar */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>{formatTimeInTz(serverTime.toISOString(), timezone)}</span>
                  <div className="flex items-center gap-1.5">
                    <span>5G</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Lock Screen Clock */}
                <div className="text-center my-6 space-y-1">
                  <div className="text-4xl font-extralight tracking-tighter">
                    {formatTimeInTz(serverTime.toISOString(), timezone)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDateInTz(serverTime.toISOString(), timezone)}
                  </div>
                </div>

                {/* Simulated Push Notification Banner */}
                <div
                  id="smartphone-notification-card"
                  className={`bg-slate-800/90 backdrop-blur-md rounded-2xl p-3 border border-slate-700 shadow-xl transition-all duration-300 ${
                    isSentEffect ? 'scale-105 ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                      <Bell className="w-3 h-3 text-amber-400" />
                      <span>PLANAI SCHEDULER</span>
                    </div>
                    <span>vừa xong</span>
                  </div>
                  <h5 className="font-bold text-xs text-white mb-0.5">{customTitle}</h5>
                  <p className="text-[11px] text-slate-300 leading-relaxed">{customMsg}</p>
                </div>

                {/* Lock screen bottom icons */}
                <div className="flex items-center justify-between pt-6 text-slate-400">
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center">
                    <Radio className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center">
                    <Volume2 className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
              </div>
            </div>

            {/* Test Fire Trigger Form */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tiêu đề thông báo:
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung:
                </label>
                <input
                  type="text"
                  value={customMsg}
                  onChange={(e) => setCustomMsg(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-200 text-xs font-medium"
                />
              </div>

              <button
                id="test-notification-fire-btn"
                onClick={handleFireTest}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Bắn thử thông báo Push ngay bây giờ</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Advance Settings & Notification History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Reminder Timing Preference */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">Thời gian nhắc trước (Advance Reminder)</h3>
                <p className="text-xs text-slate-500">
                  Cấu hình số phút hệ thống tự động thông báo trước khi tiết học hoặc ca làm việc bắt đầu
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              {advanceOptions.map((mins) => (
                <button
                  key={mins}
                  onClick={() => updatePreferences({ reminderAdvanceMinutes: mins })}
                  className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                    advanceMinutes === mins
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base">{mins}</span>
                  <span className="text-[10px] font-normal">phút trước</span>
                </button>
              ))}
            </div>
          </div>

          {/* Notification History */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Nhật ký thông báo ({notifications.length})</span>
              </h3>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Chưa có thông báo nào được ghi nhận.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all ${
                      !n.read
                        ? 'bg-indigo-50/60 border-indigo-200 shadow-xs'
                        : 'bg-slate-50/80 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{n.title}</span>
                          {!n.read && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-slate-600 leading-relaxed">{n.message}</p>
                      </div>

                      <div className="text-right shrink-0 text-[10px] text-slate-400 space-y-1">
                        <div>{formatTimeInTz(n.createdAt, timezone)}</div>
                        <div>{formatDateInTz(n.createdAt, timezone)}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
