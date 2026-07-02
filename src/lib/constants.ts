// ============================================
// Sahas Attendance — Constants & Configuration
// ============================================

/** Valid session types for attendance tracking */
export const SESSION_TYPES = [
  'Technical',
  'Workout',
  'General Meeting',
] as const;

export type SessionType = (typeof SESSION_TYPES)[number];

/** Regex to validate member ID format: SAHAS-MEM-001, SAHAS-MEM-042, etc. */
export const MEMBER_ID_REGEX = /^SAHAS-MEM-\d{3,}$/;

/** Cookie name for auth JWT */
export const AUTH_COOKIE_NAME = 'sahas-auth';

/** JWT expiry duration (24 hours in seconds) */
export const JWT_EXPIRY_SECONDS = 86400;

/** Throttle delay after a successful scan (ms) */
export const SCAN_THROTTLE_MS = 3000;

/** LocalStorage key for offline queue */
export const OFFLINE_QUEUE_KEY = 'sahas-offline-queue';

/** Google Sheets tab names */
export const SHEETS = {
  ATTENDANCE: 'Attendance',
  MEMBERS: 'Members',
} as const;

/** Attendance row column headers */
export const ATTENDANCE_HEADERS = [
  'Timestamp',
  'Member ID',
  'Member Name',
  'Session Type',
  'Status',
] as const;

/** Members row column headers */
export const MEMBER_HEADERS = [
  'Member ID',
  'Name',
  'Email',
  'Created At',
] as const;
