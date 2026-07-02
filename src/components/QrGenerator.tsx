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
    topPercent: '30%',      // Position the QR code slightly higher as seen in reference
    widthPercent: '50%',
    canvasY: 420,
    canvasSize: 480,
    bgPadding: 16,
    borderRadius: 0,        // Clean sharp edges for the white box like the second image
  },
  name: {
    topPercent: '68%',      // Shifted safely down below the box
    canvasY: 960,
    fontSize: 64,           // Crisp, dominant large size
    fontFamily: 'Georgia, serif',
    fontWeight: 'bold',
    color: '#1a1a1a',       // Deep high-contrast dark color
  },
  year: {
    topPercent: '77%',      // Clean vertical line-gap spacing underneath the name
    canvasY: 1060,
    fontSize: 36,
    fontFamily: 'Georgia, serif',
    fontWeight: 'normal',
    color: '#3f3f46',       // Balanced neutral dark accent color
    text: '2026-27'
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
      const { canvasY, canvasSize, bgPadding } = TEMPLATE_CONFIG.qr;
      const qrX = (cardWidth - canvasSize) / 2;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(
        qrX - bgPadding,
        canvasY - bgPadding,
        canvasSize + bgPadding * 2,
        canvasSize + bgPadding * 2
      );

      ctx.drawImage(canvas, qrX, canvasY, canvasSize, canvasSize);

      // 3. Draw Member Name (Centered, Serif)
      ctx.fillStyle = TEMPLATE_CONFIG.name.color;
      ctx.font = `${TEMPLATE_CONFIG.name.fontWeight} ${TEMPLATE_CONFIG.name.fontSize}px ${TEMPLATE_CONFIG.name.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(registeredName, cardWidth / 2, TEMPLATE_CONFIG.name.canvasY);

      // 4. Draw Year (Centered, Serif)
      ctx.fillStyle = TEMPLATE_CONFIG.year.color;
      ctx.font = `${TEMPLATE_CONFIG.year.fontWeight} ${TEMPLATE_CONFIG.year.fontSize}px ${TEMPLATE_CONFIG.year.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.fillText(TEMPLATE_CONFIG.year.text, cardWidth / 2, TEMPLATE_CONFIG.year.canvasY);

      // 5. Trigger download
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
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-855 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm"
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
              className="absolute left-1/2 -translate-x-1/2 bg-white p-2 border border-stone-200 shadow-sm flex items-center justify-center aspect-square"
            >
              <QRCodeCanvas
                value={generatedId}
                size={180}
                style={{ width: '100%', height: '100%' }}
                level="H"
                marginSize={2}
              />
            </div>

            {/* 2. Member Name Text Overlay */}
            <div
              style={{ top: TEMPLATE_CONFIG.name.topPercent }}
              className="absolute left-0 right-0 text-center px-4"
            >
              <p
                style={{
                  color: TEMPLATE_CONFIG.name.color,
                  fontWeight: TEMPLATE_CONFIG.name.fontWeight as any,
                  fontFamily: TEMPLATE_CONFIG.name.fontFamily,
                }}
                className="text-base sm:text-lg font-bold truncate drop-shadow-sm"
              >
                {registeredName}
              </p>
            </div>

            {/* 3. Year Text Overlay */}
            <div
              style={{ top: TEMPLATE_CONFIG.year.topPercent }}
              className="absolute left-0 right-0 text-center"
            >
              <p
                style={{
                  color: TEMPLATE_CONFIG.year.color,
                  fontWeight: TEMPLATE_CONFIG.year.fontWeight as any,
                  fontFamily: TEMPLATE_CONFIG.year.fontFamily,
                }}
                className="text-[10px] sm:text-xs tracking-wider"
              >
                {TEMPLATE_CONFIG.year.text}
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
