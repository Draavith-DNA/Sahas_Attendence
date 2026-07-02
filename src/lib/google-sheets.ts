// ============================================
// Sahas Attendance — Google Sheets API Client
// ============================================

import { google, sheets_v4 } from 'googleapis';
import { SHEETS, ATTENDANCE_HEADERS, MEMBER_HEADERS } from './constants';
import type { SessionType } from './constants';

// ----- Types -----

export interface AttendanceRow {
  timestamp: string;
  memberId: string;
  memberName: string;
  sessionType: SessionType;
  status: string;
}

export interface Member {
  memberId: string;
  name: string;
  email: string;
  createdAt: string;
}

// ----- Auth & Client -----

let sheetsClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (sheetsClient) return sheetsClient;

  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEETS_ID;

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error(
      'Missing Google Sheets env vars: GOOGLE_SHEETS_CLIENT_EMAIL, GOOGLE_SHEETS_PRIVATE_KEY, GOOGLE_SHEETS_ID'
    );
  }

  const auth = new google.auth.JWT(
    clientEmail,
    undefined,
    privateKey.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID is not set');
  return id;
}

// ----- Sheet Initialization -----

/**
 * Ensure the sheet tabs exist with proper headers.
 * Call this lazily on first API request.
 */
export async function ensureSheetStructure(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  try {
    // Get existing sheet names
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheets = spreadsheet.data.sheets?.map((s) => s.properties?.title) ?? [];

    // Create Attendance tab if missing
    if (!existingSheets.includes(SHEETS.ATTENDANCE)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEETS.ATTENDANCE } } }],
        },
      });
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [ATTENDANCE_HEADERS as unknown as string[]] },
      });
    }

    // Create Members tab if missing
    if (!existingSheets.includes(SHEETS.MEMBERS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEETS.MEMBERS } } }],
        },
      });
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.MEMBERS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [MEMBER_HEADERS as unknown as string[]] },
      });
    }
  } catch (error) {
    console.error('Error ensuring sheet structure:', error);
    throw error;
  }
}

// ----- Attendance Operations -----

/** Append a single attendance row */
export async function appendAttendance(row: AttendanceRow): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.ATTENDANCE}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[row.timestamp, row.memberId, row.memberName, row.sessionType, row.status]],
    },
  });
}

/** Check if a member was already scanned for a given session type + date */
export async function checkDuplicate(
  memberId: string,
  sessionType: string,
  date: string
): Promise<boolean> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.ATTENDANCE}!A:E`,
  });

  const rows = response.data.values ?? [];
  return rows.some((row) => {
    const rowDate = row[0]?.toString().split(',')[0]?.trim() ?? '';
    const rowMemberId = row[1]?.toString().trim() ?? '';
    const rowSessionType = row[3]?.toString().trim() ?? '';
    // Match by member ID + session type + date portion of timestamp
    return rowMemberId === memberId && rowSessionType === sessionType && rowDate.startsWith(date);
  });
}

// ----- Member Operations -----

/** Get all members from the Members sheet */
export async function getMembers(): Promise<Member[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.MEMBERS}!A:D`,
  });

  const rows = response.data.values ?? [];
  // Skip header row
  return rows.slice(1).map((row) => ({
    memberId: row[0] ?? '',
    name: row[1] ?? '',
    email: row[2] ?? '',
    createdAt: row[3] ?? '',
  }));
}

/** Look up a member name by their ID */
export async function getMemberName(memberId: string): Promise<string | null> {
  const members = await getMembers();
  const member = members.find((m) => m.memberId === memberId);
  return member?.name ?? null;
}

/** Add a new member and return the generated ID */
export async function addMember(name: string, email: string): Promise<Member> {
  const members = await getMembers();

  // Generate next sequential ID
  let maxNum = 0;
  for (const m of members) {
    const match = m.memberId.match(/SAHAS-MEM-(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  }

  const nextId = `SAHAS-MEM-${String(maxNum + 1).padStart(3, '0')}`;
  const createdAt = new Date().toISOString();

  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.MEMBERS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[nextId, name, email, createdAt]],
    },
  });

  return { memberId: nextId, name, email, createdAt };
}
