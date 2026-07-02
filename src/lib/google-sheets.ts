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
 * For Attendance: A1 must be "Names".
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
        requestBody: { values: [['Names']] },
      });
    } else {
      // Validate A1 is "Names"
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1`,
      });
      const firstCell = res.data.values?.[0]?.[0];
      if (firstCell !== 'Names') {
        // Migration: Reset old attendance sheet structure to new matrix structure
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEETS.ATTENDANCE}!A:ZZ`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEETS.ATTENDANCE}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [['Names']] },
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

// ----- Attendance Matrix Operations -----

/** Record attendance using the matrix grid layout */
export async function recordAttendanceMatrix(
  memberId: string,
  sessionType: SessionType,
  date: string
): Promise<{ memberName: string }> {
  const memberName = await getMemberName(memberId);
  if (!memberName) {
    throw new Error(`Member ID ${memberId} is not registered.`);
  }

  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  // Read full Attendance sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:ZZ`,
  });

  const matrix = response.data.values ?? [[]];
  const headers = matrix[0] ?? [];
  const memberNames = matrix.map((row) => row[0]).slice(1); // Column A values (excluding A1)

  // Find or create session column
  const sessionHeader = date;
  let colIndex = headers.indexOf(sessionHeader) + 1; // 1-based index
  let isNewColumn = false;

  if (colIndex === 0) {
    isNewColumn = true;
    colIndex = headers.length + 1;
    const colLetter = getColumnLetter(colIndex);

    // Write header cell in Row 1 of Attendance
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!${colLetter}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[sessionHeader]] },
    });

    // Log the created session in the Sessions tab
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEETS.SESSIONS}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date, sessionType]],
      },
    });
  }

  // Find or create member row
  let rowIdx = memberNames.indexOf(memberName) + 2; // 2-based index (header is row 1)

  if (rowIdx === 1) { // not found (indexOf returns -1)
    // Append member to Column A
    rowIdx = matrix.length + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!A${rowIdx}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[memberName]] },
    });
  }

  const colLetter = getColumnLetter(colIndex);

  if (isNewColumn) {
    // Fill the new column: "Present" for current member, "Absent" for everyone else
    const totalRows = Math.max(matrix.length, rowIdx);
    const colValues: string[][] = [];
    for (let r = 2; r <= totalRows; r++) {
      colValues.push([r === rowIdx ? 'Present' : 'Absent']);
    }

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!${colLetter}2:${colLetter}${totalRows}`,
      valueInputOption: 'RAW',
      requestBody: { values: colValues },
    });
  } else {
    // Simply mark the member as Present
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!${colLetter}${rowIdx}`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Present']] },
    });
  }

  return { memberName };
}

/** Check if a member is already marked "Present" in the matrix for this session */
export async function checkDuplicate(
  memberId: string,
  sessionType: string,
  date: string
): Promise<boolean> {
  const memberName = await getMemberName(memberId);
  if (!memberName) return false;

  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:ZZ`,
  });

  const matrix = response.data.values ?? [[]];
  const headers = matrix[0] ?? [];
  const memberNames = matrix.map((row) => row[0]).slice(1);

  const sessionHeader = date;
  const colIndex = headers.indexOf(sessionHeader);
  const rowIndex = memberNames.indexOf(memberName) + 1;

  if (colIndex === -1 || rowIndex === 0) {
    return false;
  }

  return matrix[rowIndex]?.[colIndex] === 'Present';
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
