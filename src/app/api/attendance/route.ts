// ============================================
// Sahas Attendance — Attendance API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME, MEMBER_ID_REGEX, SHEETS } from '@/lib/constants';
import {
  recordAttendance,
  checkDuplicate,
  getMemberName,
  ensureSheetStructure,
  getMembers,
} from '@/lib/google-sheets';

let sheetsInitialized = false;

/** GET /api/attendance — Fetch attendance history */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get('date') || '';
    const typeFilter = searchParams.get('type') || 'all';

    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
    const sheetId = process.env.GOOGLE_SHEETS_ID;

    if (!clientEmail || !privateKey || !sheetId) {
      return NextResponse.json({ records: [] });
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Fetch attendance matrix records
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEETS.ATTENDANCE}!A:ZZ`,
    });

    const rows = response.data.values ?? [];
    const headers = rows[0] ?? [];

    // Fetch members to map memberName back to memberId
    const members = await getMembers();
    const memberNameToIdMap = new Map<string, string>();
    for (const member of members) {
      memberNameToIdMap.set(member.name.toLowerCase().trim(), member.memberId);
    }

    // Fetch sessions to map date to sessionType
    const sessionsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEETS.SESSIONS}!A:B`,
    });
    const sessionsRows = sessionsResponse.data.values ?? [];
    const dateToSessionTypeMap = new Map<string, string>();
    for (const row of sessionsRows.slice(1)) {
      const dateVal = row[0] ?? '';
      const typeVal = row[1] ?? 'Session';
      if (dateVal) {
        dateToSessionTypeMap.set(dateVal.split('T')[0], typeVal);
      }
    }

    const records: {
      timestamp: string;
      memberId: string;
      memberName: string;
      sessionType: string;
      status: string;
    }[] = [];

    // Reconstruct transactional records from the matrix
    if (rows.length > 0 && headers.length > 1) {
      for (let colIdx = 1; colIdx < headers.length; colIdx++) {
        const dateVal = headers[colIdx];
        if (!dateVal) continue;
        const cleanDate = dateVal.split('T')[0];

        // Filter by date during traversal if date filter is set (perf optimization)
        if (dateFilter && cleanDate !== dateFilter) {
          continue;
        }

        const sessionType = dateToSessionTypeMap.get(cleanDate) || 'Session';

        for (let rowIdx = 1; rowIdx < rows.length; rowIdx++) {
          const row = rows[rowIdx];
          if (!row || row.length === 0) continue;
          const nameVal = row[0] ?? '';
          if (!nameVal) continue;

          const statusVal = row[colIdx] ?? '';
          if (statusVal && statusVal !== 'Absent') {
            const memberId = memberNameToIdMap.get(nameVal.toLowerCase().trim()) || 'UNKNOWN';
            records.push({
              timestamp: cleanDate,
              memberId,
              memberName: nameVal,
              sessionType,
              status: statusVal,
            });
          }
        }
      }
    }

    // Apply session type filters
    const filteredRecords = records.filter((r) => {
      let matchesType = false;
      if (typeFilter === 'all') {
        matchesType = true;
      } else if (typeFilter === 'sunday') {
        matchesType = r.sessionType.startsWith('Sahas Sunday');
      } else if (typeFilter === 'meeting') {
        matchesType = r.sessionType === 'Meeting';
      } else if (typeFilter === 'others') {
        matchesType = !r.sessionType.startsWith('Sahas Sunday') && r.sessionType !== 'Meeting';
      }
      return matchesType;
    });

    // Newest records first (since date columns are ordered chronologically, reversing gives newest)
    filteredRecords.reverse();

    return NextResponse.json({ records: filteredRecords });
  } catch (error) {
    console.error('Attendance GET error:', error);
    return NextResponse.json({ records: [] });
  }
}

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
    const { memberId, sessionType, date, arrivalStatus, eventStartTime } = body;

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

    if (typeof sessionType !== 'string' || sessionType.trim().length === 0 || sessionType.length > 100) {
      return NextResponse.json(
        { error: 'Invalid session type name. Must be between 1 and 100 characters.' },
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

    // 5. Record to Sheet
    const { memberName } = await recordAttendance(
      memberId,
      sessionType,
      date,
      arrivalStatus || 'Present',
      eventStartTime || '07:00'
    );

    return NextResponse.json({
      success: true,
      memberId,
      memberName,
      sessionType,
      date,
      arrivalStatus: arrivalStatus || 'Present',
      eventStartTime: eventStartTime || '07:00',
    });
  } catch (error) {
    console.error('Attendance POST API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
