// ============================================
// Sahas Attendance — Dashboard Home Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SessionConfig from '@/components/SessionConfig';

export default function DashboardPage() {
  const router = useRouter();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('');

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch member count
  useEffect(() => {
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMemberCount(data.members?.length ?? 0))
      .catch(() => setMemberCount(null));
  }, []);

  const handleStartScanning = (sessionType: string, date: string) => {
    const params = new URLSearchParams({ type: sessionType, date });
    router.push(`/dashboard/scanner?${params.toString()}`);
  };

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-stone-500 text-sm font-medium">{greeting}</p>
        <h1 className="text-2xl font-bold text-stone-900 mt-1">Technical Head</h1>
        <p className="text-stone-400 text-xs mt-2">{todayFormatted}</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {memberCount !== null ? memberCount : '—'}
          </p>
          <p className="text-stone-500 text-xs mt-0.5 font-medium">Total Members</p>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-stone-900">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
          <p className="text-stone-500 text-xs mt-0.5 font-medium">Today</p>
        </div>
      </div>

      {/* Session Configuration */}
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900 mb-4">Start a Session</h2>
        <SessionConfig onStartScanning={handleStartScanning} />
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/dashboard/members')}
          className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-stone-800 text-sm font-semibold">Add Member</p>
            <p className="text-stone-500 text-[10px] font-medium">Generate QR</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/history')}
          className="flex items-center gap-3 p-4 bg-stone-50 border border-stone-200 rounded-2xl hover:bg-stone-100 transition-all active:scale-[0.98] shadow-sm"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-left">
            <p className="text-stone-800 text-sm font-semibold">View History</p>
            <p className="text-stone-500 text-[10px] font-medium">Past scans</p>
          </div>
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={async () => {
          await fetch('/api/auth', { method: 'DELETE' });
          window.location.href = '/login';
        }}
        className="mt-8 w-full py-3 text-stone-400 hover:text-stone-600 text-sm font-semibold transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
