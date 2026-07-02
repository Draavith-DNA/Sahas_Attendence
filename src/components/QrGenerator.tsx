// ============================================
// Sahas Attendance — QR Generator Component
// ============================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QrGeneratorProps {
  onMemberCreated?: () => void;
}

// ========================================================
// 🛠️ GRAPHICS TEMPLATE CONFIGURATION (900 x 1380 px canvas)
// ========================================================
// Modify these values to align overlays precisely with your sahas-template.jpg design
const TEMPLATE_CONFIG = {
  qr: {
    topPercent: '52%', // CSS vertical positioning
    widthPercent: '52%', // CSS width proportion (More bigger!)
    canvasY: 670,      // Canvas vertical coordinate (pixels)
    canvasSize: 480,   // Canvas QR size (pixels) (More bigger!)
    bgPadding: 16,     // White background padding (pixels)
    borderRadius: 24,  // White background border radius (pixels)
  },
  name: {
    bottomPercent: '13%', // CSS vertical positioning (centered text zone)
    canvasY: 1210,        // Canvas vertical coordinate (pixels)
    fontSize: 40,         // Canvas font size (pixels)
    color: '#4a2711',     // Dark Brown color
  },
  year: {
    fontSize: 40,         // Canvas font size (pixels)
    color: '#b59a83',     // Light Brown color
  }
};

export default function QrGenerator({ onMemberCreated }: QrGeneratorProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [generatedId, setGeneratedId] = useState<string | null>(null);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setGeneratedId(data.member.memberId);
        setRegisteredName(data.member.name);
        setName('');
        setEmail('');
        onMemberCreated?.();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create member');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [name, email, onMemberCreated]);

  const handleDownload = useCallback(() => {
    if (!qrRef.current || !generatedId || !registeredName) return;

    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    const img = new Image();
    img.src = '/sahas-template.jpg';
    img.onload = () => {
      // Create export canvas matching original 900x1380 template dimensions
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');
      if (!ctx) return;

      const cardWidth = 900;
      const cardHeight = 1380;

      exportCanvas.width = cardWidth;
      exportCanvas.height = cardHeight;

      // 1. Draw template background image
      ctx.drawImage(img, 0, 0, cardWidth, cardHeight);

      // 2. Draw QR Code with white background padding for contrast
      const { canvasY, canvasSize, bgPadding, borderRadius } = TEMPLATE_CONFIG.qr;
      const qrX = (cardWidth - canvasSize) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(
        qrX - bgPadding,
        canvasY - bgPadding,
        canvasSize + bgPadding * 2,
        canvasSize + bgPadding * 2,
        borderRadius
      );
      ctx.fill();

      ctx.drawImage(canvas, qrX, canvasY, canvasSize, canvasSize);

      // 3. Draw Member Name & Year with inline centering alignment
      const nameText = registeredName;
      const yearText = '   2026-27'; // 3 spaces

      ctx.font = `bold ${TEMPLATE_CONFIG.name.fontSize}px Inter, system-ui, sans-serif`;
      const nameWidth = ctx.measureText(nameText).width;

      ctx.font = `bold ${TEMPLATE_CONFIG.year.fontSize}px Inter, system-ui, sans-serif`;
      const yearWidth = ctx.measureText(yearText).width;

      const totalWidth = nameWidth + yearWidth;
      const startX = (cardWidth - totalWidth) / 2;

      // Draw Name (Dark Brown)
      ctx.fillStyle = TEMPLATE_CONFIG.name.color;
      ctx.font = `bold ${TEMPLATE_CONFIG.name.fontSize}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(nameText, startX, TEMPLATE_CONFIG.name.canvasY);

      // Draw Year (Light Brown)
      ctx.fillStyle = TEMPLATE_CONFIG.year.color;
      ctx.font = `bold ${TEMPLATE_CONFIG.year.fontSize}px Inter, system-ui, sans-serif`;
      ctx.fillText(yearText, startX + nameWidth, TEMPLATE_CONFIG.name.canvasY);

      // 4. Trigger download
      const link = document.createElement('a');
      link.download = `${generatedId}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    };
  }, [generatedId, registeredName]);

  return (
    <div className="space-y-5">
      {/* Input Form */}
      <div className="space-y-3">
        <div>
          <label htmlFor="member-name" className="block text-sm font-medium text-stone-500 mb-1.5">
            Member Name
          </label>
          <input
            id="member-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-850 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm"
          />
        </div>
        <div>
          <label htmlFor="member-email" className="block text-sm font-medium text-stone-500 mb-1.5">
            Email Address
          </label>
          <input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-850 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm"
          />
        </div>

        {error && (
          <p className="text-rose-600 text-sm bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || !name.trim() || !email.trim()}
          className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating…
            </span>
          ) : (
            'Generate QR Code'
          )}
        </button>
      </div>

      {/* Generated QR Card Overlay View */}
      {generatedId && registeredName && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col items-center space-y-5 animate-fade-in shadow-sm">
          <div className="inline-flex items-center gap-2 text-sky-600 text-sm font-semibold bg-sky-500/10 px-3 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Member Registered
          </div>

          {/* Interactive Layered Card Container */}
          <div className="relative w-full max-w-[280px] aspect-[900/1380] rounded-2xl overflow-hidden shadow-lg border border-stone-250 bg-[url('/sahas-template.jpg')] bg-cover bg-center bg-no-repeat">
            {/* 1. Dynamic QR Code Absolute Overlay */}
            <div
              ref={qrRef}
              style={{
                top: TEMPLATE_CONFIG.qr.topPercent,
                width: TEMPLATE_CONFIG.qr.widthPercent,
              }}
              className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-2 rounded-xl border border-stone-200 shadow-sm flex items-center justify-center aspect-square"
            >
              <QRCodeCanvas
                value={generatedId}
                size={180}
                style={{ width: '100%', height: '100%' }}
                level="H"
                marginSize={2}
              />
            </div>

            {/* 2. Member Name & Year Text Overlay */}
            <div
              style={{ bottom: TEMPLATE_CONFIG.name.bottomPercent }}
              className="absolute left-0 right-0 text-center px-4"
            >
              <p className="font-bold text-sm sm:text-base truncate drop-shadow-sm">
                <span style={{ color: TEMPLATE_CONFIG.name.color }}>{registeredName}</span>
                <span className="whitespace-pre" style={{ color: TEMPLATE_CONFIG.year.color }}>   2026-27</span>
              </p>
            </div>
          </div>

          {/* Download trigger */}
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold rounded-xl transition-all duration-200 active:scale-[0.98] border border-stone-250 shadow-sm text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Card
          </button>
        </div>
      )}
    </div>
  );
}
