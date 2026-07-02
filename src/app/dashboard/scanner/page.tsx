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
import { playSuccess, playError, playWarning, playLateBeep, playVeryLateBeep } from '@/lib/beep';
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
  const eventStartTime = searchParams.get('startTime') || '07:00';

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

  // Utility to determine arrival status
  const getArrivalStatus = useCallback((startTimeStr: string): 'Present' | 'Late' | 'V-Late' => {
    if (!startTimeStr) return 'Present';
    try {
      const [startHours, startMinutes] = startTimeStr.split(':').map(Number);
      const now = new Date();
      const eventStart = new Date(now);
      eventStart.setHours(startHours, startMinutes, 0, 0);
      const diffMs = now.getTime() - eventStart.getTime();
      const diffMinutes = diffMs / 1000 / 60;

      if (diffMinutes <= 10) {
        return 'Present';
      } else if (diffMinutes <= 20) {
        return 'Late';
      } else {
        return 'V-Late';
      }
    } catch {
      return 'Present';
    }
  }, []);

  // Helper to trigger audio and visual feedback based on arrival status
  const triggerFeedbackForStatus = useCallback((status: 'Present' | 'Late' | 'V-Late', memberName: string, subText: string) => {
    if (status === 'Present') {
      playSuccess();
      setFeedback({
        type: 'present',
        message: memberName,
        subMessage: `${subText} (Present)`,
      });
    } else if (status === 'Late') {
      playLateBeep();
      setFeedback({
        type: 'late',
        message: 'MARKED LATE',
        subMessage: `${memberName} (${subText})`,
      });
    } else {
      playVeryLateBeep();
      setFeedback({
        type: 'v-late',
        message: 'MARKED VERY LATE',
        subMessage: `${memberName} (${subText})`,
      });
    }
  }, []);

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

      const status = getArrivalStatus(eventStartTime);

      if (!isOnline) {
        // Queue for offline sync
        triggerFeedbackForStatus(status, 'Queued Offline', `${memberId} — will sync when online`);
        enqueue({ memberId, sessionType, date, arrivalStatus: status, eventStartTime });
        setScannedIds((prev) => new Set(prev).add(memberId));
        setScanRecords((prev) => [
          {
            memberId,
            memberName: `Queued (${status})`,
            timestamp: new Date().toISOString(),
            status: 'queued',
          },
          ...prev,
        ]);
        setScanCount((c) => c + 1);
        return;
      }

      try {
        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memberId,
            sessionType,
            date,
            arrivalStatus: status,
            eventStartTime,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          triggerFeedbackForStatus(status, data.memberName || memberId, memberId);
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
        triggerFeedbackForStatus(status, 'Queued (offline)', `${memberId} — will sync later`);
        enqueue({ memberId, sessionType, date, arrivalStatus: status, eventStartTime });
        setScannedIds((prev) => new Set(prev).add(memberId));
        setScanCount((c) => c + 1);
      }
    },
    [scannedIds, isOnline, sessionType, date, eventStartTime, enqueue, getArrivalStatus, triggerFeedbackForStatus]
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
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-xl border-b border-[#e8dfd5]">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-[#8a7060] hover:text-[#3d2314] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-bold">Back</span>
        </button>

        <div className="text-center">
          <p className="text-[#3d2314] text-sm font-bold">{sessionType}</p>
          <p className="text-[#8a7060] text-[10px] font-bold">{date}</p>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className="relative flex items-center gap-1 text-[#8a7060] hover:text-[#3d2314] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          {scanCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#c5a880] text-[10px] text-white font-bold rounded-full flex items-center justify-center">
              {scanCount}
            </span>
          )}
        </button>
      </div>

      {/* Scanner / History Toggle */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#3d2314]">
              Scanned ({scanCount})
            </h2>
            <button
              onClick={() => setShowHistory(false)}
              className="text-[#8e735b] text-sm font-bold hover:underline"
            >
              Back to Scanner
            </button>
          </div>
          <ScanHistory records={scanRecords} />
        </div>
      ) : (
        <div className="flex-1 relative bg-white flex items-center justify-center p-6">
          <div className="w-full max-w-sm aspect-square">
            <QrScanner
              onScan={handleScan}
              onError={handleScanError}
              enabled={!feedback}
            />
          </div>

          {/* Scan counter overlay */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[#f7f2ed]/90 backdrop-blur-sm px-5 py-2.5 rounded-full border border-[#e8dfd5] flex items-center gap-3 shadow-md">
            <div className="w-2.5 h-2.5 rounded-full bg-[#c5a880] animate-pulse-glow" />
            <span className="text-[#3d2314] text-sm font-bold">
              {scanCount} scanned
            </span>
            {!isOnline && (
              <span className="text-amber-600 text-xs font-bold">• Offline</span>
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
        <div className="fixed inset-0 bg-white flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#8e735b] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ScannerContent />
    </Suspense>
  );
}
