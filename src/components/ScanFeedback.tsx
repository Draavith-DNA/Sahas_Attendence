// ============================================
// Sahas Attendance — Scan Feedback Overlay
// ============================================

'use client';

import { useEffect, useState } from 'react';

export type FeedbackType = 'success' | 'duplicate' | 'error';

interface ScanFeedbackProps {
  type: FeedbackType;
  message: string;
  subMessage?: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export default function ScanFeedback({
  type,
  message,
  subMessage,
  onDismiss,
  autoDismissMs = 2000,
}: ScanFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, onDismiss]);

  const config = {
    success: {
      bg: 'from-[#8e735b] to-[#a88c74]',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ),
      ring: 'ring-[#c5a880]/30',
    },
    duplicate: {
      bg: 'from-amber-500 to-amber-600',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      ring: 'ring-amber-300/30',
    },
    error: {
      bg: 'from-rose-500 to-rose-600',
      icon: (
        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
      ring: 'ring-rose-300/30',
    },
  };

  const { bg, icon, ring } = config[type];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#3d2314]/50 backdrop-blur-sm" />

      {/* Content */}
      <div
        className={`relative flex flex-col items-center gap-4 p-8 rounded-3xl bg-gradient-to-br ${bg} ${ring} ring-4 shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'
        }`}
      >
        {/* Pulsing ring animation */}
        <div className="relative">
          <div className={`absolute inset-0 rounded-full bg-white/10 animate-ping`} />
          <div className="relative text-white">{icon}</div>
        </div>

        <div className="text-center">
          <p className="text-white text-xl font-bold">{message}</p>
          {subMessage && (
            <p className="text-white/80 text-sm mt-1">{subMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
}
