// ============================================
// Sahas Attendance — Session Config Component
// ============================================

'use client';

import { useState, useCallback } from 'react';

interface SessionConfigProps {
  onStartScanning: (sessionName: string, date: string) => void;
}

type MainCategory = 'sunday' | 'meeting' | 'others';
type SundaySubOption = 'Technical' | 'Workout' | 'Team-bonding activity' | 'Others';

export default function SessionConfig({ onStartScanning }: SessionConfigProps) {
  const [category, setCategory] = useState<MainCategory>('sunday');
  const [sundaySub, setSundaySub] = useState<SundaySubOption>('Technical');
  const [customText, setCustomText] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });

  const handleStart = useCallback(() => {
    let finalSessionName = '';

    if (category === 'meeting') {
      finalSessionName = 'Meeting';
    } else if (category === 'others') {
      const trimmed = customText.trim();
      finalSessionName = trimmed || 'Custom Event';
    } else if (category === 'sunday') {
      if (sundaySub === 'Others') {
        const trimmed = customText.trim();
        finalSessionName = `Sahas Sunday (${trimmed || 'Other Activity'})`;
      } else {
        finalSessionName = `Sahas Sunday (${sundaySub})`;
      }
    }

    onStartScanning(finalSessionName, date);
  }, [category, sundaySub, customText, date, onStartScanning]);

  return (
    <div className="space-y-6">
      {/* Category Selector */}
      <div>
        <label className="block text-sm font-medium text-zinc-400 mb-3">
          Session Category
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['sunday', 'meeting', 'others'] as const).map((cat) => {
            const labels = {
              sunday: 'Sahas Sunday',
              meeting: 'Meeting',
              others: 'Others',
            };
            const activeColors = {
              sunday: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 ring-2 ring-emerald-500/20',
              meeting: 'bg-blue-500/20 text-blue-300 border-blue-500/50 ring-2 ring-blue-500/20',
              others: 'bg-violet-500/20 text-violet-300 border-violet-500/50 ring-2 ring-violet-500/20',
            };
            const inactiveColors = 'bg-zinc-800/40 border-zinc-700/30 text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800/60';

            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setCustomText(''); // Reset custom description
                }}
                className={`py-3 px-2 rounded-xl text-xs font-semibold border text-center transition-all duration-200 ${
                  category === cat ? activeColors[cat] : inactiveColors
                }`}
              >
                {labels[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sahas Sunday Sub-Options */}
      {category === 'sunday' && (
        <div className="space-y-3 p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-2xl animate-fade-in">
          <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Select Sunday Activity
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['Technical', 'Workout', 'Team-bonding activity', 'Others'] as const).map((sub) => {
              const isActive = sundaySub === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setSundaySub(sub);
                    setCustomText(''); // Reset description
                  }}
                  className={`py-2.5 px-3 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold'
                      : 'bg-zinc-800/20 border-zinc-700/20 text-zinc-400 hover:text-zinc-300'
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Text Input for "Others" category or Sunday -> "Others" sub-option */}
      {((category === 'sunday' && sundaySub === 'Others') || category === 'others') && (
        <div className="space-y-1.5 animate-fade-in">
          <label htmlFor="custom-session-text" className="block text-sm font-medium text-zinc-400">
            {category === 'sunday' ? 'Describe Sunday Activity' : 'Specify Session Type'}
          </label>
          <input
            id="custom-session-text"
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={category === 'sunday' ? 'e.g. Guest Seminar, Community outreach' : 'e.g. Board Meet, Workshop'}
            className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all text-sm"
          />
        </div>
      )}

      {/* Date Picker */}
      <div>
        <label htmlFor="session-date" className="block text-sm font-medium text-zinc-400 mb-1.5">
          Session Date
        </label>
        <input
          id="session-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all [color-scheme:dark]"
        />
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-lg rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-3"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Start Scanning
      </button>
    </div>
  );
}
