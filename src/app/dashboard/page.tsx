// ============================================
// Sahas Attendance — Dashboard Home Page
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SessionConfig from '@/components/SessionConfig';
import { getActiveSession } from '@/lib/session';
import type { ActiveSession } from '@/lib/session';

export default function DashboardPage() {
  const router = useRouter();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('');
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // Fetch active session from localStorage
  useEffect(() => {
    const active = getActiveSession();
    const today = new Date().toISOString().split('T')[0];
    if (active && active.date === today) {
      setActiveSession(active);
    }
  }, []);

  // Fetch member count
  useEffect(() => {
    fetch('/api/members')
      .then((res) => res.json())
      .then((data) => setMemberCount(data.members?.length ?? 0))
      .catch(() => setMemberCount(null));
  }, []);

  const handleStartScanning = (sessionType: string, date: string, startTime: string) => {
    const params = new URLSearchParams({ type: sessionType, date, startTime });
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
        <p className="text-[#8a7060] font-bold text-base tracking-wide uppercase">{greeting},</p>
        <h1 className="text-3xl font-black text-[#3d2314] mt-1 tracking-tight">Admin</h1>
        <p className="text-[#8e735b] text-xs font-bold mt-2.5">{todayFormatted}</p>
      </div>

      {/* Active Session Recovery Banner */}
      {activeSession && (
        <div className="mb-6 p-4 bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl flex items-center justify-between animate-fade-in shadow-sm">
          <div className="flex-1 min-w-0 pr-3">
            <span className="text-[#8e735b] text-[10px] font-bold uppercase tracking-wider block">
              Active Session Found
            </span>
            <h3 className="text-[#3d2314] text-sm font-bold truncate mt-0.5">
              {activeSession.sessionType}
            </h3>
            <p className="text-[#8a7060] text-xs font-semibold mt-0.5">
              Started at {activeSession.startTime} today
            </p>
          </div>
          <button
            onClick={() => {
              handleStartScanning(
                activeSession.sessionType,
                activeSession.date,
                activeSession.startTime
              );
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#8e735b] hover:bg-[#765d48] text-white text-xs font-bold rounded-xl transition-all duration-200 shadow-sm flex-shrink-0"
          >
            Resume
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#b59a83]/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8e735b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[#3d2314]">
            {memberCount !== null ? memberCount : '—'}
          </p>
          <p className="text-[#8a7060] text-xs mt-0.5 font-bold">Total Members</p>
        </div>

        <div className="bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#c5a880]/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-[#a88c74]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-[#3d2314]">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </p>
          <p className="text-[#8a7060] text-xs mt-0.5 font-bold">Today</p>
        </div>
      </div>

      {/* Session Configuration */}
      <div className="bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-bold text-[#3d2314] mb-4">Start a Session</h2>
        <SessionConfig onStartScanning={handleStartScanning} />
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push('/dashboard/members')}
          className="flex items-center gap-3 p-4 bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl hover:bg-[#e8dfd5] transition-all active:scale-[0.98] shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#b59a83]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#8e735b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <div>
            <p className="text-[#3d2314] text-sm font-bold">Add Member</p>
            <p className="text-[#8a7060] text-[10px] font-semibold">Generate QR</p>
          </div>
        </button>

        <button
          onClick={() => router.push('/dashboard/history')}
          className="flex items-center gap-3 p-4 bg-[#f7f2ed] border border-[#e8dfd5] rounded-2xl hover:bg-[#e8dfd5] transition-all active:scale-[0.98] shadow-sm text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[#c5a880]/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#a88c74]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-[#3d2314] text-sm font-bold">View History</p>
            <p className="text-[#8a7060] text-[10px] font-semibold">Past scans</p>
          </div>
        </button>
      </div>

      {/* Logout */}
      <button
        onClick={async () => {
          await fetch('/api/auth', { method: 'DELETE' });
          window.location.href = '/login';
        }}
        className="mt-8 w-full py-3 text-[#b59a83] hover:text-[#8e735b] text-sm font-bold transition-colors"
      >
        Sign Out
      </button>
    </div>
  );
}
