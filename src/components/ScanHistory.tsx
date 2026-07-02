// ============================================
// Sahas Attendance — Scan History Component
// ============================================

'use client';

interface ScanRecord {
  memberId: string;
  memberName: string;
  timestamp: string;
  status: 'success' | 'duplicate' | 'queued';
}

interface ScanHistoryProps {
  records: ScanRecord[];
}

export default function ScanHistory({ records }: ScanHistoryProps) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">No scans yet</p>
        <p className="text-zinc-600 text-xs mt-1">Scanned members will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {records.map((record, index) => (
        <div
          key={`${record.memberId}-${index}`}
          className="flex items-center gap-3 p-3 bg-zinc-800/30 border border-zinc-700/30 rounded-xl animate-slide-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Status indicator */}
          <div
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              record.status === 'success'
                ? 'bg-emerald-400'
                : record.status === 'duplicate'
                ? 'bg-amber-400'
                : 'bg-blue-400'
            }`}
          />

          {/* Member info */}
          <div className="flex-1 min-w-0">
            <p className="text-zinc-100 text-sm font-medium truncate">{record.memberName}</p>
            <p className="text-zinc-500 text-xs font-mono">{record.memberId}</p>
          </div>

          {/* Timestamp */}
          <div className="text-right flex-shrink-0">
            <p className="text-zinc-400 text-xs">
              {new Date(record.timestamp).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {record.status === 'queued' && (
              <span className="text-blue-400 text-xs">Queued</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
