// ============================================
// Sahas Attendance — QR Generator Component
// ============================================

'use client';

import { useState, useRef, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QrGeneratorProps {
  onMemberCreated?: () => void;
}

export default function QrGenerator({ onMemberCreated }: QrGeneratorProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [generatedId, setGeneratedId] = useState<string | null>(null);
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
    if (!qrRef.current || !generatedId) return;

    const canvas = qrRef.current.querySelector('canvas');
    if (!canvas) return;

    // Create a branded card
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const cardWidth = 400;
    const qrSize = 280;
    const headerHeight = 70;
    const footerHeight = 60;
    const cardHeight = headerHeight + qrSize + footerHeight + padding * 2;

    exportCanvas.width = cardWidth;
    exportCanvas.height = cardHeight;

    // Background
    ctx.fillStyle = '#09090b';
    ctx.roundRect(0, 0, cardWidth, cardHeight, 16);
    ctx.fill();

    // Header — branding
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 28px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAHAS', cardWidth / 2, padding + 32);

    ctx.fillStyle = '#a1a1aa';
    ctx.font = '13px Inter, system-ui, sans-serif';
    ctx.fillText('Member Identity Card', cardWidth / 2, padding + 52);

    // QR Code
    const qrX = (cardWidth - qrSize) / 2;
    const qrY = padding + headerHeight;

    // White background for QR
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12);
    ctx.fill();

    ctx.drawImage(canvas, qrX, qrY, qrSize, qrSize);

    // Footer — member ID
    ctx.fillStyle = '#fafafa';
    ctx.font = 'bold 16px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(generatedId, cardWidth / 2, qrY + qrSize + 36);

    // Download
    const link = document.createElement('a');
    link.download = `${generatedId}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }, [generatedId]);

  return (
    <div className="space-y-5">
      {/* Input Form */}
      <div className="space-y-3">
        <div>
          <label htmlFor="member-name" className="block text-sm font-medium text-zinc-400 mb-1.5">
            Member Name
          </label>
          <input
            id="member-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter full name"
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
        </div>
        <div>
          <label htmlFor="member-email" className="block text-sm font-medium text-zinc-400 mb-1.5">
            Email Address
          </label>
          <input
            id="member-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="member@example.com"
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
          />
        </div>

        {error && (
          <p className="text-rose-400 text-sm bg-rose-500/10 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading || !name.trim() || !email.trim()}
          className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98]"
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

      {/* Generated QR Display */}
      {generatedId && (
        <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-2xl p-6 text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium bg-emerald-500/10 px-3 py-1.5 rounded-full">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Member Registered
          </div>

          {/* QR Code render (hidden for card export, visible for preview) */}
          <div ref={qrRef} className="flex justify-center">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeCanvas
                value={generatedId}
                size={200}
                level="H"
                marginSize={2}
              />
            </div>
          </div>

          <div>
            <p className="text-zinc-100 font-mono text-lg font-bold">{generatedId}</p>
            <p className="text-zinc-500 text-xs mt-1">Scan this code at Sahas sessions</p>
          </div>

          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-100 font-medium rounded-xl transition-all duration-200 active:scale-[0.98]"
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
