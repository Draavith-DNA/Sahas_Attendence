// ============================================
// Sahas Attendance — Login Page (PIN Pad)
// ============================================

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const router = useRouter();

  const maxDigits = 6;

  const handleDigit = useCallback(
    (digit: string) => {
      if (pin.length >= maxDigits) return;
      setError(null);
      setPin((prev) => prev + digit);
    },
    [pin]
  );

  const handleDelete = useCallback(() => {
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length < 4) {
      setError('Enter at least 4 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        router.push('/dashboard');
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin('');
        setError('Invalid PIN. Try again.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [pin, router]);

  // Auto-submit when PIN is complete
  useEffect(() => {
    if (pin.length === maxDigits) {
      handleSubmit();
    }
  }, [pin, handleSubmit]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleDelete, handleSubmit]);

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 px-6 py-12">
      {/* Background gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-emerald-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo & Branding */}
        <div className="mb-10 text-center">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse-glow">
            <span className="text-3xl font-black text-white tracking-tighter">S</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-50 tracking-tight">SAHAS</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Attendance System</p>
        </div>

        {/* PIN Dots */}
        <div className={`flex gap-3 mb-8 ${shake ? 'animate-shake' : ''}`}>
          {Array.from({ length: maxDigits }).map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? 'bg-emerald-400 border-emerald-400 scale-110'
                  : 'border-zinc-600 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-rose-400 text-sm mb-4 animate-fade-in">{error}</p>
        )}

        {/* PIN Pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {digits.map((digit, index) => {
            if (digit === '') {
              return <div key={index} />;
            }

            if (digit === 'del') {
              return (
                <button
                  key={index}
                  onClick={handleDelete}
                  disabled={pin.length === 0}
                  className="aspect-square rounded-2xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all duration-150 active:scale-90 disabled:opacity-30"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0110.828 5H19a2 2 0 012 2v10a2 2 0 01-2 2h-8.172a2 2 0 01-1.414-.586L3 12z"
                    />
                  </svg>
                </button>
              );
            }

            return (
              <button
                key={index}
                onClick={() => handleDigit(digit)}
                disabled={isLoading}
                className="aspect-square rounded-2xl bg-zinc-800/40 border border-zinc-700/30 text-zinc-100 text-2xl font-semibold flex items-center justify-center hover:bg-zinc-700/50 hover:border-zinc-600/50 transition-all duration-150 active:scale-90 active:bg-emerald-500/20 active:border-emerald-500/30 disabled:opacity-50"
              >
                {digit}
              </button>
            );
          })}
        </div>

        {/* Loading indicator */}
        {isLoading && (
          <div className="mt-6 flex items-center gap-2 text-emerald-400 animate-fade-in">
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <span className="text-sm">Verifying…</span>
          </div>
        )}

        {/* Footer hint */}
        <p className="mt-10 text-zinc-600 text-xs text-center">
          Enter your 6-digit admin PIN to continue
        </p>
      </div>
    </div>
  );
}
