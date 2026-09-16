/**
 * InstallAppBanner — gợi ý cài PlanAI lên màn hình chính điện thoại.
 *
 * - Android/Chrome: dùng sự kiện beforeinstallprompt để mở hộp thoại cài đặt
 *   PWA chính thức (manifest.webmanifest + service worker).
 * - iOS/Safari: Safari không hỗ trợ beforeinstallprompt, nên hiển thị hướng
 *   dẫn "Chia sẻ → Thêm vào Màn hình chính".
 * - Ẩn đi khi app đã chạy ở chế độ standalone (đã cài) hoặc khi người dùng bấm đóng.
 */
import React, { useEffect, useState } from 'react';
import { X, Download, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'planai_install_dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && (navigator as any).maxTouchPoints > 1)
  );
}

export const InstallAppBanner: React.FC = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // đã cài rồi → không hiện
    if (localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS: không có beforeinstallprompt → hiện hướng dẫn sau 2.5s
    if (isIos()) {
      const t = setTimeout(() => setShowIosGuide(true), 2500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    setVisible(false);
    setShowIosGuide(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, '1');
    }
    setInstallEvent(null);
  };

  if (isStandalone()) return null;

  if (showIosGuide) {
    return (
      <div
        id="ios-install-guide"
        className="fixed bottom-3 left-3 right-3 z-40 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm bg-white rounded-2xl border border-slate-200 shadow-xl p-4 space-y-2"
      >
        <button
          onClick={dismiss}
          aria-label="Đóng"
          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-indigo-600">
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-bold text-slate-900">Cài PlanAI lên iPhone</span>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed flex items-start gap-1.5">
          <span>1. Nhấn nút <strong>Chia sẻ</strong> <Share2 className="w-3.5 h-3.5 inline text-slate-500" /> trên Safari</span>
        </p>
        <p className="text-xs text-slate-600 leading-relaxed">
          2. Chọn <strong>“Thêm vào Màn hình chính”</strong> <PlusSquare className="w-3.5 h-3.5 inline text-slate-500" /><br />
          3. Mở app từ icon trên màn hình chính — chạy độc lập như app thật 📱
        </p>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div
      id="install-app-banner"
      className="fixed bottom-3 left-3 right-3 z-40 sm:left-auto sm:right-4 sm:bottom-4 sm:max-w-sm bg-white rounded-2xl border border-indigo-200 shadow-xl p-4 flex items-start gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shrink-0">
        <Download className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900">Cài PlanAI lên điện thoại</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          Thêm vào màn hình chính để dùng như app native, chạy cả khi mất mạng.
        </p>
        <button
          id="install-app-btn"
          onClick={install}
          className="mt-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition-colors"
        >
          Cài đặt ngay
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Đóng"
        className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
