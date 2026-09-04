import React, { useEffect, useState } from 'react';
import { Bell, X, Calendar, Clock, CheckCircle2, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatTimeInTz } from '../utils/time';

export const MobileNotificationToast: React.FC = () => {
  const { activeToast, dismissToast, currentUser, setActiveTab } = useApp();
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!activeToast || isHovered) return;
    const timer = setTimeout(() => {
      dismissToast();
    }, 7000);
    return () => clearTimeout(timer);
  }, [activeToast, isHovered, dismissToast]);

  if (!activeToast) return null;

  const timezone = currentUser?.timezone || 'Asia/Ho_Chi_Minh';
  const timeFormatted = formatTimeInTz(activeToast.scheduledFor || new Date().toISOString(), timezone);

  return (
    <div
      id="mobile-notification-toast"
      className="fixed top-5 right-5 z-50 max-w-md w-full transition-all duration-300 transform translate-y-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 p-4 backdrop-blur-xl">
        {/* Smartphone Notification Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-medium text-indigo-400">
            <Smartphone className="w-3.5 h-3.5" />
            <span>THÔNG BÁO ĐIỆN THOẠI • VỪA XONG</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-300">{timeFormatted}</span>
            <button
              id="dismiss-toast-btn"
              onClick={dismissToast}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-100 mb-0.5">
              {activeToast.title}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeToast.message}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 mt-3 pt-2 border-t border-slate-800/80 text-xs">
          <button
            id="view-schedule-from-toast"
            onClick={() => {
              setActiveTab('calendar');
              dismissToast();
            }}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
            Xem lịch biểu
          </button>
          <button
            id="view-notifs-from-toast"
            onClick={() => {
              setActiveTab('notifications');
              dismissToast();
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Chi tiết
          </button>
        </div>
      </div>
    </div>
  );
};
