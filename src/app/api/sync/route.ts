// ============================================
// Sahas Attendance — Bulk Sync API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME, MEMBER_ID_REGEX } from '@/lib/constants';
import {
  appendAttendance,
  checkDuplicate,
  getMemberName,
  ensureSheetStructure,
} from '@/lib/google-sheets';

/** POST /api/sync — Bulk upload offline queue */
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

    // 2. Parse body
    const body = await request.json();
    const { records } = body;

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'records array is required' }, { status: 400 });
    }

    // 3. Ensure sheets structure
    await ensureSheetStructure();

    // 4. Process each record
    let synced = 0;
    let duplicates = 0;
    let errors = 0;

    for (const record of records) {
      try {
        const { memberId, sessionType, date } = record;

        // Validate format
        if (!MEMBER_ID_REGEX.test(memberId)) {
          errors++;
          continue;
        }

        // Check duplicate
        const isDuplicate = await checkDuplicate(memberId, sessionType, date);
        if (isDuplicate) {
          duplicates++;
          continue;
        }

        // Look up name
        const memberName = (await getMemberName(memberId)) ?? 'Unknown Member';

        // Append row
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

        synced++;
      } catch {
        errors++;
      }
    }

    return NextResponse.json({ synced, duplicates, errors });
  } catch (error) {
    console.error('Sync API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
