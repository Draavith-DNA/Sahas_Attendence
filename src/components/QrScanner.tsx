// ============================================
// Sahas Attendance — QR Scanner Component
// ============================================

'use client';

import dynamic from 'next/dynamic';
import { useState, useCallback, useRef, useEffect } from 'react';
import { SCAN_THROTTLE_MS, MEMBER_ID_REGEX } from '@/lib/constants';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';

// Dynamically import the scanner with SSR disabled (requires browser camera APIs)
const Scanner = dynamic(
  () => import('@yudiel/react-qr-scanner').then((m) => m.Scanner),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-2xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-zinc-400 text-sm">Initializing camera…</span>
        </div>
      </div>
    ),
  }
);

interface QrScannerProps {
  onScan: (memberId: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export default function QrScanner({ onScan, onError, enabled = true }: QrScannerProps) {
  const [isThrottled, setIsThrottled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScanRef = useRef<string>('');
  const throttleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, []);

  const handleScan = useCallback(
    (detectedCodes: IDetectedBarcode[]) => {
      if (!enabled || isThrottled || detectedCodes.length === 0) return;

      const decoded = detectedCodes[0].rawValue.trim();

      // Validate member ID format
      if (!MEMBER_ID_REGEX.test(decoded)) {
        onError?.(`Invalid QR code: "${decoded}"`);
        return;
      }

      // Prevent rapid re-scans of the same code
      if (decoded === lastScanRef.current) return;
      lastScanRef.current = decoded;

      // Throttle to prevent rapid consecutive scans
      setIsThrottled(true);
      throttleTimerRef.current = setTimeout(() => {
        setIsThrottled(false);
        lastScanRef.current = '';
      }, SCAN_THROTTLE_MS);

      onScan(decoded);
    },
    [enabled, isThrottled, onScan, onError]
  );

  const handleError = useCallback(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes('Permission') || message.includes('NotAllowed')) {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (message.includes('NotFound') || message.includes('DevicesNotFound')) {
        setCameraError('No camera found on this device.');
      }
      // Don't spam non-critical errors (e.g., frame decode failures)
    },
    []
  );

  if (cameraError) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 rounded-2xl p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <p className="text-rose-400 font-medium mb-2">Camera Error</p>
          <p className="text-zinc-400 text-sm">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl bg-black">
      {/* Scanner */}
      <Scanner
        onScan={handleScan}
        onError={handleError}
        formats={['qr_code']}
        sound={false}
        paused={!enabled || isThrottled}
        components={{
          torch: true,
          finder: false,
        }}
        styles={{
          container: {
            width: '100%',
            height: '100%',
          },
          video: {
            objectFit: 'cover' as const,
          },
        }}
        constraints={{
          facingMode: 'environment',
        }}
      />

      {/* Custom scanning overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Scanning frame */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64">
            {/* Corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-emerald-400 rounded-br-lg" />

            {/* Scanning line animation */}
            {enabled && !isThrottled && (
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-line" />
            )}
          </div>
        </div>

        {/* Dim overlay outside scanning area */}
        <div className="absolute inset-0 bg-black/40" style={{
          maskImage: 'radial-gradient(ellipse 160px 160px at center, transparent 50%, black 51%)',
          WebkitMaskImage: 'radial-gradient(ellipse 160px 160px at center, transparent 50%, black 51%)',
        }} />
      </div>

      {/* Throttle indicator */}
      {isThrottled && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500/20 text-emerald-300 text-sm px-4 py-2 rounded-full backdrop-blur-sm border border-emerald-500/30">
          ✓ Processing…
        </div>
      )}
    </div>
  );
}
