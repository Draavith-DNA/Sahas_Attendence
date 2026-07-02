// ============================================
// Sahas Attendance — Attendance API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME, MEMBER_ID_REGEX, SHEETS } from '@/lib/constants';
import {
  recordAttendanceMatrix,
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

    // 1. Fetch member registry to map Name -> ID
    const membersList = await getMembers();
    const nameToId = new Map<string, string>();
    for (const m of membersList) {
      nameToId.set(m.name, m.memberId);
    }

    // 2. Fetch attendance matrix
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEETS.ATTENDANCE}!A:ZZ`,
    });

    const matrix = response.data.values ?? [[]];
    const headers = matrix[0] ?? [];
    const memberRows = matrix.slice(1);

    const records: Array<{
      timestamp: string;
      memberId: string;
      memberName: string;
      sessionType: string;
      status: string;
    }> = [];

    // Columns B (index 1) onwards are session columns
    for (let c = 1; c < headers.length; c++) {
      const header = headers[c] ?? '';
      // Parse "YYYY-MM-DD (Session Type)"
      const match = header.match(/^([\d-]+)\s*\((.+)\)$/);
      if (!match) continue;

      const datePart = match[1];
      const typePart = match[2];

      // Apply date and session type filters
      const matchesDate = dateFilter ? datePart === dateFilter : true;
      const matchesType = typeFilter !== 'all' ? typePart === typeFilter : true;

      if (matchesDate && matchesType) {
        for (const row of memberRows) {
          const memberName = row[0] ?? '';
          if (!memberName) continue;

          const statusVal = row[c] ?? 'Absent';
          records.push({
            timestamp: datePart,
            memberId: nameToId.get(memberName) || 'N/A',
            memberName,
            sessionType: typePart,
            status: statusVal,
          });
        }
      }
    }

    // Newest sessions first
    records.reverse();

    return NextResponse.json({ records });
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

    // 5. Record to Matrix
    const { memberName } = await recordAttendanceMatrix(memberId, sessionType, date);

    return NextResponse.json({
      success: true,
      memberId,
      memberName,
      sessionType,
      date,
    });
  } catch (error) {
    console.error('Attendance API error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
