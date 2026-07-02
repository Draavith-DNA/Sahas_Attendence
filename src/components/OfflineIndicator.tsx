// ============================================
// Sahas Attendance — Offline Indicator Bar
// ============================================

'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

export default function OfflineIndicator() {
  const { isOnline } = useNetworkStatus();
  const { queueSize, isSyncing } = useOfflineQueue();

  // Don't render if online and no queued items
  if (isOnline && queueSize === 0 && !isSyncing) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${
        !isOnline
          ? 'translate-y-0'
          : isSyncing
          ? 'translate-y-0'
          : queueSize > 0
          ? 'translate-y-0'
          : '-translate-y-full'
      }`}
    >
      <div
        className={`flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium ${
          !isOnline
            ? 'bg-amber-500/90 text-amber-950 backdrop-blur-sm'
            : isSyncing
            ? 'bg-sky-500/90 text-sky-950 backdrop-blur-sm'
            : 'bg-emerald-500/90 text-emerald-950 backdrop-blur-sm'
        }`}
      >
        {!isOnline ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12h.01" />
            </svg>
            <span>Offline Mode</span>
            {queueSize > 0 && (
              <span className="bg-amber-950/20 px-2 py-0.5 rounded-full text-xs">
                {queueSize} queued
              </span>
            )}
          </>
        ) : isSyncing ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-blue-950/30 border-t-blue-950 rounded-full animate-spin" />
            <span>Syncing {queueSize} records…</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{queueSize} records ready to sync</span>
          </>
        )}
      </div>
    </div>
  );
}
