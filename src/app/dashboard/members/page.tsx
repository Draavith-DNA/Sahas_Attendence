// ============================================
// Sahas Attendance — Members Page
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import QrGenerator from '@/components/QrGenerator';

interface Member {
  memberId: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function MembersPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.memberId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-50">Members</h1>
        <p className="text-zinc-500 text-sm mt-1">
          {members.length} registered member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-1 mb-6">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'list'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Members List
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
            activeTab === 'generate'
              ? 'bg-zinc-800 text-zinc-100 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          Generate QR
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'list' ? (
        <div className="space-y-4 animate-fade-in">
          {/* Search */}
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search members…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-800/30 border border-zinc-700/30 rounded-xl text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
            />
          </div>

          {/* Members List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-zinc-500 text-sm">
                {searchQuery ? 'No members match your search' : 'No members yet'}
              </p>
              <p className="text-zinc-600 text-xs mt-1">
                {searchQuery ? 'Try a different search term' : 'Generate QR codes to add members'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member, index) => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-3 p-3.5 bg-zinc-800/20 border border-zinc-700/20 rounded-xl animate-slide-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/20 border border-emerald-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 text-sm font-medium truncate">{member.name}</p>
                    <p className="text-zinc-500 text-xs truncate">{member.email}</p>
                  </div>

                  {/* Member ID badge */}
                  <span className="text-zinc-500 text-[10px] font-mono bg-zinc-800/50 px-2 py-1 rounded-md flex-shrink-0">
                    {member.memberId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <QrGenerator onMemberCreated={fetchMembers} />
        </div>
      )}
    </div>
  );
}
