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
        <h1 className="text-2xl font-black text-[#3d2314]">Members</h1>
        <p className="text-[#8a7060] text-sm mt-1 font-bold">
          {members.length} registered member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-1 bg-[#f7f2ed] border border-[#e8dfd5] rounded-xl p-1 mb-6 shadow-sm">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'list'
              ? 'bg-white text-[#8e735b] shadow-sm border border-[#e8dfd5]'
              : 'text-[#b59a83] hover:text-[#3d2314]'
          }`}
        >
          Members List
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${
            activeTab === 'generate'
              ? 'bg-white text-[#8e735b] shadow-sm border border-[#e8dfd5]'
              : 'text-[#b59a83] hover:text-[#3d2314]'
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
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#b59a83]"
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
              className="w-full pl-10 pr-4 py-3 bg-white border border-[#e8dfd5] rounded-xl text-[#3d2314] text-sm placeholder:text-[#b59a83] focus:outline-none focus:ring-2 focus:ring-[#8e735b]/30 focus:border-[#8e735b] transition-all font-semibold"
            />
          </div>

          {/* Members List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#8e735b] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#f7f2ed] flex items-center justify-center mx-auto mb-4 border border-[#e8dfd5]">
                <svg className="w-8 h-8 text-[#b59a83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-[#8a7060] text-sm font-bold">
                {searchQuery ? 'No members match your search' : 'No members yet'}
              </p>
              <p className="text-[#b59a83] text-xs mt-1 font-semibold">
                {searchQuery ? 'Try a different search term' : 'Generate QR codes to add members'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member, index) => (
                <div
                  key={member.memberId}
                  className="flex items-center gap-3 p-3.5 bg-[#f7f2ed] border border-[#e8dfd5] rounded-xl animate-slide-in shadow-sm"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-[#c5a880]/15 border border-[#c5a880]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#8e735b] font-bold text-sm">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[#3d2314] text-sm font-bold truncate">{member.name}</p>
                    <p className="text-[#8a7060] text-xs truncate font-semibold">{member.email}</p>
                  </div>

                  {/* Member ID badge */}
                  <span className="text-[#8a7060] text-[10px] font-bold font-mono bg-white px-2 py-1 rounded-md flex-shrink-0 border border-[#e8dfd5] shadow-xs">
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
