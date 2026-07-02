// ============================================
// Sahas Attendance — Active Session Memory
// ============================================

export interface ActiveSession {
  sessionType: string;
  date: string;
  startTime: string;
  createdAt: number; // Millisecond timestamp
}

const ACTIVE_SESSION_KEY = 'sahas-active-session';
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Get active session from localStorage with 24h auto-expiry logic */
export function getActiveSession(): ActiveSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as ActiveSession;
    
    // Auto-expiry check (24 hours)
    if (Date.now() - session.createdAt > SESSION_EXPIRY_MS) {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

/** Save active session to localStorage */
export function saveActiveSession(sessionType: string, date: string, startTime: string): void {
  if (typeof window === 'undefined') return;
  try {
    const session: ActiveSession = {
      sessionType,
      date,
      startTime,
      createdAt: Date.now(),
    };
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch {
    console.error('Failed to save active session');
  }
}

/** Clear active session from localStorage */
export function clearActiveSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch {
    console.error('Failed to clear active session');
  }
}
