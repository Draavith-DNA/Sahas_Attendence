// ============================================
// Sahas Attendance — Attendance API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME, MEMBER_ID_REGEX, SESSION_TYPES } from '@/lib/constants';
import {
  appendAttendance,
  checkDuplicate,
  getMemberName,
  ensureSheetStructure,
} from '@/lib/google-sheets';

let sheetsInitialized = false;

/** POST /api/attendance — Record a single scan */
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Parse & validate body
    const body = await request.json();
    const { memberId, sessionType, date } = body;

    if (!memberId || !sessionType || !date) {
      return NextResponse.json(
        { error: 'memberId, sessionType, and date are required' },
        { status: 400 }
      );
    }

    if (!MEMBER_ID_REGEX.test(memberId)) {
      return NextResponse.json(
        { error: `Invalid member ID format. Expected SAHAS-MEM-XXX, got: ${memberId}` },
        { status: 400 }
      );
    }

    if (!SESSION_TYPES.includes(sessionType)) {
      return NextResponse.json(
        { error: `Invalid session type: ${sessionType}` },
        { status: 400 }
      );
    }

    // 3. Ensure Google Sheets structure
    if (!sheetsInitialized) {
      await ensureSheetStructure();
      sheetsInitialized = true;
    }

    // 4. Check for duplicate scan
    const isDuplicate = await checkDuplicate(memberId, sessionType, date);
    if (isDuplicate) {
      return NextResponse.json(
        { error: 'Already scanned', duplicate: true, memberId },
        { status: 409 }
      );
    }

    // 5. Look up member name
    const memberName = (await getMemberName(memberId)) ?? 'Unknown Member';

    // 6. Append attendance row
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    await appendAttendance({
      timestamp,
      memberId,
      memberName,
      sessionType,
      status: 'Present',
    });

    return NextResponse.json({
      success: true,
      memberId,
      memberName,
      sessionType,
      timestamp,
    });
  } catch (error) {
    console.error('Attendance API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
