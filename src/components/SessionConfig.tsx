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
        <label className="block text-sm font-medium text-stone-500 mb-3">
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
              sunday: 'bg-sky-500/10 text-sky-700 border-sky-400/50 ring-2 ring-sky-500/10',
              meeting: 'bg-sky-500/10 text-sky-700 border-sky-400/50 ring-2 ring-sky-500/10',
              others: 'bg-sky-500/10 text-sky-700 border-sky-400/50 ring-2 ring-sky-500/10',
            };
            const inactiveColors = 'bg-stone-100 border-stone-200 text-stone-600 hover:text-stone-800 hover:bg-stone-200/50';

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
        <div className="space-y-3 p-4 bg-stone-100/50 border border-stone-200/50 rounded-2xl animate-fade-in">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider">
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
                      ? 'bg-sky-500/10 text-sky-700 border-sky-500/30 font-semibold'
                      : 'bg-stone-50 border-stone-200 text-stone-500 hover:text-stone-700 hover:bg-stone-100'
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
          <label htmlFor="custom-session-text" className="block text-sm font-medium text-stone-500">
            {category === 'sunday' ? 'Describe Sunday Activity' : 'Specify Session Type'}
          </label>
          <input
            id="custom-session-text"
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder={category === 'sunday' ? 'e.g. Guest Seminar, Community outreach' : 'e.g. Board Meet, Workshop'}
            className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm"
          />
        </div>
      )}

      {/* Date Picker */}
      <div>
        <label htmlFor="session-date" className="block text-sm font-medium text-stone-500 mb-1.5">
          Session Date
        </label>
        <input
          id="session-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
        />
      </div>

      {/* Start Button */}
      <button
        onClick={handleStart}
        className="w-full py-4 px-6 bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-lg rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-sky-500/20 flex items-center justify-center gap-3"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
        </svg>
        Start Scanning
      </button>
    </div>
  );
}
