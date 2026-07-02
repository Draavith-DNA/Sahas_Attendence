// ============================================
// Sahas Attendance — Google Sheets API Client
// ============================================

import { google, sheets_v4 } from 'googleapis';
import { SHEETS, ATTENDANCE_HEADERS, MEMBER_HEADERS, SESSION_HEADERS } from './constants';
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

  if (
    !clientEmail ||
    !privateKey ||
    !sheetId ||
    clientEmail.includes('your-service-account') ||
    privateKey.includes('YOUR_KEY_HERE') ||
    sheetId === 'your_spreadsheet_id_here'
  ) {
    throw new Error(
      'Google Sheets credentials are not configured or are using placeholder values in .env.local'
    );
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEETS_ID;
  if (!id) throw new Error('GOOGLE_SHEETS_ID is not set');
  return id;
}

// ----- Column Helper -----

/** Convert 1-based column index to Excel-style column letter (e.g. 1 -> A, 27 -> AA) */
export function getColumnLetter(colIndex: number): string {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let modulo = (temp - 1) % 26;
    letter = String.fromCharCode(65 + modulo) + letter;
    temp = Math.floor((temp - modulo) / 26);
  }
  return letter;
}

// ----- Sheet Initialization -----

/**
 * Ensure the sheet tabs exist with proper headers.
 * For Attendance: Row 1 must have Timestamp, Member ID, Member Name, Session Type, Status, Event Start Time.
 * For Members: A1 must be Member ID header.
 * For Sessions: A1 must be Date, B1 must be Session Name.
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
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Timestamp', 'Member ID', 'Member Name', 'Session Type', 'Status', 'Event Start Time']] },
      });
    } else {
      // Validate A1 is "Timestamp"
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1:F1`,
      });
      const headers = res.data.values?.[0];
      if (!headers || headers[0] !== 'Timestamp') {
        // Migration: Reset old attendance sheet structure to transactional structure
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEETS.ATTENDANCE}!A:ZZ`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEETS.ATTENDANCE}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Timestamp', 'Member ID', 'Member Name', 'Session Type', 'Status', 'Event Start Time']] },
        });
      }
    }

    // Create Members tab if missing
    if (!existingSheets.includes(SHEETS.MEMBERS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEETS.MEMBERS } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.MEMBERS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [MEMBER_HEADERS as unknown as string[]] },
      });
    }

    // Create Sessions tab if missing
    if (!existingSheets.includes(SHEETS.SESSIONS)) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: SHEETS.SESSIONS } } }],
        },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.SESSIONS}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [SESSION_HEADERS as unknown as string[]] },
      });
    }
  } catch (error) {
    console.error('Error ensuring sheet structure:', error);
    throw error;
  }
}

// ----- Attendance Log Operations -----

/** Record attendance to the transactional sheet */
export async function recordAttendance(
  memberId: string,
  sessionType: string,
  date: string,
  arrivalStatus: string = 'Present',
  eventStartTime: string = '07:00'
): Promise<{ memberName: string }> {
  const memberName = await getMemberName(memberId);
  if (!memberName) {
    throw new Error(`Member ID ${memberId} is not registered.`);
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const timestamp = new Date().toISOString();

  // Log the created session in the Sessions tab if it doesn't exist
  const sessionsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.SESSIONS}!A:B`,
  });
  const sessionsRows = sessionsResponse.data.values ?? [];
  const sessionExists = sessionsRows.some(row => row[0] === date && row[1] === sessionType);
  if (!sessionExists) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEETS.SESSIONS}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, sessionType]],
      },
    });
  }

  // Append scan record to Attendance sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[timestamp, memberId, memberName, sessionType, arrivalStatus, eventStartTime]],
    },
  });

  return { memberName };
}

/** Check if a member is already marked in the attendance log for this session date */
export async function checkDuplicate(
  memberId: string,
  sessionType: string,
  date: string
): Promise<boolean> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:E`,
  });

  const rows = response.data.values ?? [];
  // Columns: A: Timestamp, B: Member ID, C: Member Name, D: Session Type, E: Status
  return rows.slice(1).some((row) => {
    const rowMemberId = row[1] ?? '';
    const rowSessionType = row[3] ?? '';
    const rowTimestamp = row[0] ?? '';
    return (
      rowMemberId === memberId &&
      rowSessionType === sessionType &&
      rowTimestamp.startsWith(date)
    );
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

  // 1. Add to Members tab
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.MEMBERS}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[nextId, name, email, createdAt]],
    },
  });

  // 2. Append to Attendance Column A so the matrix stays in sync
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.ATTENDANCE}!A:A`,
  });
  const currentNames = response.data.values ?? [];
  const nextRow = currentNames.length + 1;

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.ATTENDANCE}!A${nextRow}`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [[name]],
    },
  });

  return { memberId: nextId, name, email, createdAt };
}
