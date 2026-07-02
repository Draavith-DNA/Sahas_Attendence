// ============================================
// Sahas Attendance — Scanner Page (Full Screen)
// ============================================

'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import QrScanner from '@/components/QrScanner';
import ScanFeedback from '@/components/ScanFeedback';
import ScanHistory from '@/components/ScanHistory';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';
import { playSuccess, playError, playWarning } from '@/lib/beep';
import type { FeedbackType } from '@/components/ScanFeedback';

interface ScanRecord {
  memberId: string;
  memberName: string;
  timestamp: string;
  status: 'success' | 'duplicate' | 'queued';
}

function ScannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const { enqueue } = useOfflineQueue();

  const sessionType = searchParams.get('type') || 'General Meeting';
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const [scanCount, setScanCount] = useState(0);
  const [scanRecords, setScanRecords] = useState<ScanRecord[]>([]);
  const [scannedIds, setScannedIds] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState(false);

  // Feedback state
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
    subMessage?: string;
  } | null>(null);

  const handleScan = useCallback(
    async (memberId: string) => {
      // Client-side duplicate check for current session
      if (scannedIds.has(memberId)) {
        playWarning();
        setFeedback({
          type: 'duplicate',
          message: 'Already Scanned',
          subMessage: memberId,
        });
        return;
      }

      if (!isOnline) {
        // Queue for offline sync
        playSuccess();
        enqueue({ memberId, sessionType, date });
        setScannedIds((prev) => new Set(prev).add(memberId));
        setScanRecords((prev) => [
          {
            memberId,
            memberName: 'Queued (offline)',
            timestamp: new Date().toISOString(),
            status: 'queued',
          },
          ...prev,
        ]);
        setScanCount((c) => c + 1);
        setFeedback({
          type: 'success',
          message: 'Queued Offline',
          subMessage: `${memberId} — will sync when online`,
        });
        return;
      }

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, sessionType, date }),
        });

        const data = await res.json();

        if (res.ok) {
          playSuccess();
          setScannedIds((prev) => new Set(prev).add(memberId));
          setScanRecords((prev) => [
            {
              memberId,
              memberName: data.memberName || memberId,
              timestamp: new Date().toISOString(),
              status: 'success',
            },
            ...prev,
          ]);
          setScanCount((c) => c + 1);
          setFeedback({
            type: 'success',
            message: data.memberName || 'Member Recorded',
            subMessage: memberId,
          });
        } else if (data.duplicate) {
          playWarning();
          setScannedIds((prev) => new Set(prev).add(memberId));
          setFeedback({
            type: 'duplicate',
            message: 'Already Scanned',
            subMessage: memberId,
          });
        } else {
          playError();
          setFeedback({
            type: 'error',
            message: 'Scan Error',
            subMessage: data.error || 'Unknown error',
          });
        }
      } catch {
        // Network failed mid-request — queue it
        playSuccess();
        enqueue({ memberId, sessionType, date });
        setScannedIds((prev) => new Set(prev).add(memberId));
        setScanCount((c) => c + 1);
        setFeedback({
          type: 'success',
          message: 'Queued (offline)',
          subMessage: `${memberId} — will sync later`,
        });
      }
    },
    [scannedIds, isOnline, sessionType, date, enqueue]
  );

  const handleScanError = useCallback((error: string) => {
    playError();
    setFeedback({
      type: 'error',
      message: 'Invalid QR',
      subMessage: error,
    });
  }, []);

  // Keep screen awake using Wake Lock API
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake lock not supported or not available
      }
    }

    requestWakeLock();

    return () => {
      wakeLock?.release();
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-zinc-950 flex flex-col">
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">Back</span>
        </button>

        <div className="text-center">
          <p className="text-zinc-200 text-sm font-semibold">{sessionType}</p>
          <p className="text-zinc-500 text-[10px]">{date}</p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="relative flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {scanCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center">
              {scanCount}
            </span>
          )}
        </button>
      </div>

      {/* Scanner / History Toggle */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-100">
              Scanned ({scanCount})
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-emerald-400 text-sm font-medium"
            >
              Back to Scanner
            </button>
          </div>
          <ScanHistory records={scanRecords} />
        </div>
      ) : (
        <div className="flex-1 relative">
          <QrScanner
            onScan={handleScan}
            onError={handleScanError}
            enabled={!feedback}
          />

          {/* Scan counter overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900/80 backdrop-blur-sm px-5 py-2.5 rounded-full border border-zinc-700/50 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-zinc-200 text-sm font-medium">
              {scanCount} scanned
            </span>
            {!isOnline && (
              <span className="text-amber-400 text-xs">• Offline</span>
            )}
          </div>
        </div>
      )}

      {/* Feedback Overlay */}
      {feedback && (
        <ScanFeedback
          type={feedback.type}
          message={feedback.message}
          subMessage={feedback.subMessage}
          onDismiss={() => setFeedback(null)}
        />
      )}
    </div>
  );
}

export default function ScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-zinc-950 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}
