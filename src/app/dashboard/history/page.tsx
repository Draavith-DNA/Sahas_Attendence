// ============================================
// Sahas Attendance — History Page
// ============================================

'use client';

import { useState } from 'react';

interface HistoryRecord {
  timestamp: string;
  memberId: string;
  memberName: string;
  sessionType: string;
  status: string;
}

export default function HistoryPage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [hasFetched, setHasFetched] = useState(false);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/attendance?date=${selectedDate}&type=${selectedType}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (selectedType === 'all') return true;
    if (selectedType === 'sunday') return r.sessionType.startsWith('Sahas Sunday');
    if (selectedType === 'meeting') return r.sessionType === 'Meeting';
    if (selectedType === 'others') return !r.sessionType.startsWith('Sahas Sunday') && r.sessionType !== 'Meeting';
    return true;
  });

  return (
    <div className="px-5 pt-14 pb-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#3d2314]">History</h1>
        <p className="text-[#8a7060] text-sm mt-1 font-bold">View past attendance records</p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-6">
        {/* Date filter */}
        <div>
          <label htmlFor="history-date" className="block text-sm font-semibold text-[#8a7060] mb-1.5">
            Date
          </label>
          <input
            id="history-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-[#e8dfd5] rounded-xl text-[#3d2314] text-sm focus:outline-none focus:ring-2 focus:ring-[#8e735b]/30 focus:border-[#8e735b] transition-all font-semibold"
          />
        </div>

        {/* Session type filter */}
        <div>
          <label className="block text-sm font-semibold text-[#8a7060] mb-1.5">
            Session Type
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All Types' },
              { id: 'sunday', label: 'Sahas Sunday' },
              { id: 'meeting', label: 'Meeting' },
              { id: 'others', label: 'Others' },
            ].map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                  selectedType === type.id
                    ? 'bg-[#b59a83] text-white border-[#b59a83] shadow-xs'
                    : 'bg-[#f7f2ed] text-[#8a7060] border-[#e8dfd5] hover:text-[#3d2314] hover:bg-[#e8dfd5]'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fetch button */}
        <button
          onClick={fetchHistory}
          disabled={isLoading}
          className="w-full py-3 px-4 bg-[#8e735b] hover:bg-[#765d48] disabled:bg-[#f7f2ed] text-white disabled:text-[#b59a83] font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-md shadow-[#8e735b]/10"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Loading…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Load Records
            </>
          )}
        </button>
      </div>

      {/* Results */}
      {hasFetched && (
        <div className="animate-fade-in">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-[#f7f2ed] flex items-center justify-center mx-auto mb-4 border border-[#e8dfd5]">
                <svg className="w-8 h-8 text-[#b59a83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-[#8a7060] text-sm font-bold">No records found</p>
              <p className="text-[#b59a83] text-xs mt-1 font-semibold">
                Try a different date or session type
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[#8a7060] text-sm font-bold">
                  {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Records List */}
              <div className="space-y-2">
                {filteredRecords.map((record, index) => (
                  <div
                    key={`${record.memberId}-${record.timestamp}-${index}`}
                    className="flex items-center gap-3 p-3.5 bg-[#f7f2ed] border border-[#e8dfd5] rounded-xl animate-slide-in shadow-sm"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* Status dot */}
                    <div className="w-2.5 h-2.5 rounded-full bg-[#c5a880] flex-shrink-0" />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[#3d2314] text-sm font-bold truncate">
                        {record.memberName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[#8a7060] text-[10px] font-mono font-bold">
                          {record.memberId}
                        </span>
                        <span className="text-[#e8dfd5] text-[10px]">•</span>
                        <span className="text-[#8e735b] text-[10px] font-bold">
                          {record.sessionType}
                        </span>
                      </div>
                    </div>

                    {/* Time */}
                    <p className="text-[#8a7060] text-xs flex-shrink-0 font-bold">
                      {record.timestamp}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasFetched && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-[#f7f2ed] flex items-center justify-center mx-auto mb-4 animate-float border border-[#e8dfd5]">
            <svg className="w-8 h-8 text-[#b59a83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#8a7060] text-sm font-bold">Select a date and tap &ldquo;Load Records&rdquo;</p>
        </div>
      )}
    </div>
  );
}
