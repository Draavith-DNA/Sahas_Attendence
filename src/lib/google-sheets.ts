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
 * For Attendance: Row 1 must have Name, and columns from B1 onwards will have the Dates.
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
      // Get all registered members to populate Column A
      const members = await getMembers();
      const memberNames = members.map((m) => [m.name]);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [['Name'], ...memberNames] },
      });
    } else {
      // Validate A1 is "Name" or "Member Name"
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!A1:F1`,
      });
      const headers = res.data.values?.[0];
      const firstHeader = headers?.[0];
      if (firstHeader !== 'Name' && firstHeader !== 'Member Name') {
        // Migration check: is the old structure present?
        if (headers && headers.includes('Timestamp') && headers.includes('Member ID')) {
          // Fetch all transactional data
          const allDataRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${SHEETS.ATTENDANCE}!A:F`,
          });
          const oldRows = allDataRes.data.values ?? [];
          const oldHeaders = oldRows[0] ?? [];
          const timestampIdx = oldHeaders.indexOf('Timestamp');
          const memberIdIdx = oldHeaders.indexOf('Member ID');
          const nameIdx = oldHeaders.indexOf('Member Name');
          const statusIdx = oldHeaders.indexOf('Status');

          const members = await getMembers();
          
          // Map transaction logs to unique dates and statuses
          const uniqueDatesSet = new Set<string>();
          const recordMap = new Map<string, { [date: string]: string }>(); // memberId -> { date: status }

          // Extract date from timestamp (format: YYYY-MM-DD)
          for (let i = 1; i < oldRows.length; i++) {
            const row = oldRows[i];
            if (!row || row.length === 0) continue;
            const timestamp = row[timestampIdx] ?? '';
            const memberId = row[memberIdIdx] ?? '';
            const status = row[statusIdx] ?? 'Present';
            if (timestamp && memberId) {
              const dateStr = timestamp.split('T')[0];
              uniqueDatesSet.add(dateStr);
              if (!recordMap.has(memberId)) {
                recordMap.set(memberId, {});
              }
              // Keep the non-Absent / latest status if duplicates exist
              const existingStatus = recordMap.get(memberId)![dateStr];
              if (!existingStatus || (existingStatus === 'Absent' && status !== 'Absent')) {
                recordMap.get(memberId)![dateStr] = status;
              }
            }
          }

          const sortedDates = Array.from(uniqueDatesSet).sort();

          // Create new matrix values
          const matrixHeaders = ['Name', ...sortedDates];
          const matrixValues: string[][] = [matrixHeaders];

          for (const member of members) {
            const memberRow = [member.name];
            const memberRecords = recordMap.get(member.memberId) ?? {};
            for (const date of sortedDates) {
              memberRow.push(memberRecords[date] || 'Absent');
            }
            matrixValues.push(memberRow);
          }

          // Clear old sheet and update with matrix
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${SHEETS.ATTENDANCE}!A:ZZ`,
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEETS.ATTENDANCE}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: matrixValues },
          });
        } else {
          // If the sheet is empty or has some random values, just reset it to name-only
          const members = await getMembers();
          const memberNames = members.map((m) => [m.name]);
          await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${SHEETS.ATTENDANCE}!A:ZZ`,
          });
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${SHEETS.ATTENDANCE}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [['Name'], ...memberNames] },
          });
        }
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
    } else {
      // Validate headers
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${SHEETS.SESSIONS}!A1:C1`,
      });
      const headers = res.data.values?.[0];
      if (!headers || headers[0] !== 'Session Date' || !headers.includes('Start Time')) {
        // Migration: Read old sessions data
        const allSessionsRes = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${SHEETS.SESSIONS}!A:B`,
        });
        const oldRows = allSessionsRes.data.values ?? [];
        const newRows: string[][] = [SESSION_HEADERS as unknown as string[]];

        // Format was [Date, Session Name]
        for (let i = 1; i < oldRows.length; i++) {
          const row = oldRows[i];
          if (!row || row.length === 0) continue;
          const dateVal = row[0] ?? '';
          const nameVal = row[1] ?? '';
          if (dateVal) {
            newRows.push([dateVal, '07:00', nameVal]); // Default start time to 07:00
          }
        }

        // Clear and rewrite
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${SHEETS.SESSIONS}!A:ZZ`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${SHEETS.SESSIONS}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: newRows },
        });
      }
    }
    await sortSheets();
  } catch (error) {
    console.error('Error ensuring sheet structure:', error);
    throw error;
  }
}

// ----- Attendance Log Operations -----

/** Record attendance to the matrix sheet */
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
  const cleanDate = date.split('T')[0];

  // Log the created session in the Sessions tab if it doesn't exist
  const sessionsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.SESSIONS}!A:C`,
  });
  const sessionsRows = sessionsResponse.data.values ?? [];
  const sessionExists = sessionsRows.some(row => row[0] === cleanDate && row[2] === sessionType);
  if (!sessionExists) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEETS.SESSIONS}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[cleanDate, eventStartTime, sessionType]],
      },
    });
  }

  // Fetch current Attendance sheet
  const attendanceRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:ZZ`,
  });
  const rows = attendanceRes.data.values ?? [];
  
  // If sheet is completely empty, initialize it
  if (rows.length === 0) {
    const members = await getMembers();
    const memberNames = members.map((m) => [m.name]);
    rows.push(['Name']);
    for (const name of memberNames) {
      rows.push(name);
    }
    // Write basic structure
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }

  const headers = rows[0] || ['Name'];
  let dateColIdx = headers.indexOf(cleanDate);

  // If date column doesn't exist, create it and pre-populate with "Absent"
  if (dateColIdx === -1) {
    dateColIdx = headers.length; // Next available index
    const dateColLetter = getColumnLetter(dateColIdx + 1);
    
    // Write date header to Row 1
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!${dateColLetter}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [[cleanDate]] },
    });

    // Populate all other cells in this column with "Absent"
    // Since rows has length `rows.length`, we want to write "Absent" to rows 2 to rows.length
    if (rows.length > 1) {
      const absentValues = Array(rows.length - 1).fill(['Absent']);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!${dateColLetter}2:${dateColLetter}${rows.length}`,
        valueInputOption: 'RAW',
        requestBody: { values: absentValues },
      });
    }
  }

  // Find member's row index
  const members = await getMembers();
  const memberIdx = members.findIndex((m) => m.memberId === memberId);
  let foundRowIdx = -1;

  if (memberIdx !== -1) {
    const expectedRowIdx = memberIdx + 1; // 0-based index in rows
    if (rows[expectedRowIdx] && rows[expectedRowIdx][0] === memberName) {
      foundRowIdx = expectedRowIdx;
    }
  }

  if (foundRowIdx === -1) {
    foundRowIdx = rows.findIndex((row) => row[0] === memberName);
  }

  // If the member doesn't exist in Column A of the Attendance sheet, add them
  if (foundRowIdx === -1) {
    const nextRowIdx = rows.length + 1; // 1-based row index for sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!A${nextRowIdx}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[memberName]] },
    });
    
    // Fill their past date columns with "Absent"
    if (headers.length > 1) {
      const numPastDates = headers.length - 1;
      const pastAbsentValues = Array(numPastDates).fill('Absent');
      const lastColLetter = getColumnLetter(headers.length);
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${SHEETS.ATTENDANCE}!B${nextRowIdx}:${lastColLetter}${nextRowIdx}`,
        valueInputOption: 'RAW',
        requestBody: { values: [pastAbsentValues] },
      });
    }
    foundRowIdx = rows.length; // Update our 0-based row index reference
  }

  // Write arrival status to the specific cell
  const targetColLetter = getColumnLetter(dateColIdx + 1);
  const targetRow = foundRowIdx + 1; // Convert 0-based rows index to 1-based sheets row index
  
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!${targetColLetter}${targetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[arrivalStatus]] },
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
  const cleanDate = date.split('T')[0];

  // 1. Get member name
  const memberName = await getMemberName(memberId);
  if (!memberName) return false;

  // 2. Fetch the Attendance sheet matrix
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:ZZ`,
  });
  const rows = response.data.values ?? [];
  if (rows.length === 0) return false;

  const headers = rows[0];
  const dateIndex = headers.indexOf(cleanDate);
  if (dateIndex === -1) {
    // Date column doesn't exist, so no record can be a duplicate
    return false;
  }

  // Find member's row
  const members = await getMembers();
  const memberIdx = members.findIndex((m) => m.memberId === memberId);
  let foundRowIdx = -1;

  if (memberIdx !== -1) {
    const expectedRowIdx = memberIdx + 1; // 0-based row index in rows (where row 0 is headers)
    if (rows[expectedRowIdx] && rows[expectedRowIdx][0] === memberName) {
      foundRowIdx = expectedRowIdx;
    }
  }

  // Fallback to name search in case they were reordered or added differently
  if (foundRowIdx === -1) {
    foundRowIdx = rows.findIndex((row) => row[0] === memberName);
  }

  if (foundRowIdx === -1) {
    return false;
  }

  const status = rows[foundRowIdx][dateIndex] ?? '';
  // If the status is not empty and not "Absent", it's a duplicate scan!
  return status !== '' && status !== 'Absent';
}

// ----- Member Operations -----

/** Sort both Members and Attendance sheets alphabetically by name, then member ID number */
export async function sortSheets(): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSheetId();

  // 1. Fetch unsorted members
  const unsortedMembers = await getMembersUnsorted();
  if (unsortedMembers.length === 0) return;

  const sortedMembers = [...unsortedMembers].sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameCompare !== 0) return nameCompare;
    const numA = parseInt(a.memberId.replace(/^\D+/g, ''), 10) || 0;
    const numB = parseInt(b.memberId.replace(/^\D+/g, ''), 10) || 0;
    return numA - numB;
  });

  // Write sorted members back to Members sheet
  const sortedMemberValues = sortedMembers.map(m => [m.memberId, m.name, m.email, m.createdAt]);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEETS.MEMBERS}!A2:D`,
  });
  if (sortedMemberValues.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.MEMBERS}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: sortedMemberValues },
    });
  }

  // 2. Fetch and sort Attendance sheet
  const attendanceRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A:ZZ`,
  });
  const attendanceRows = attendanceRes.data.values ?? [];
  if (attendanceRows.length <= 1) return; // Only headers or empty

  const headers = attendanceRows[0];
  
  // Reconstruct sorted attendance rows matching the sortedMembers order
  const newAttendanceRows: string[][] = [];
  for (const member of sortedMembers) {
    const oldIdx = unsortedMembers.findIndex(m => m.memberId === member.memberId);
    let rowVal: string[];
    if (oldIdx !== -1 && attendanceRows[oldIdx + 1]) {
      rowVal = attendanceRows[oldIdx + 1];
    } else {
      rowVal = [member.name];
    }
    // Pad with 'Absent' if the row is shorter than headers
    while (rowVal.length < headers.length) {
      rowVal.push('Absent');
    }
    // Sync the name field just in case they were renamed or edited
    rowVal[0] = member.name;
    newAttendanceRows.push(rowVal);
  }

  // Clear and rewrite Attendance rows (keep header row 1 intact)
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${SHEETS.ATTENDANCE}!A2:ZZ`,
  });
  if (newAttendanceRows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEETS.ATTENDANCE}!A2`,
      valueInputOption: 'RAW',
      requestBody: { values: newAttendanceRows },
    });
  }
}

/** Get all members from the Members sheet (raw order from sheet) */
async function getMembersUnsorted(): Promise<Member[]> {
  const sheets = getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.MEMBERS}!A:D`,
  });

  const rows = response.data.values ?? [];
  return rows.slice(1).map((row) => ({
    memberId: row[0] ?? '',
    name: row[1] ?? '',
    email: row[2] ?? '',
    createdAt: row[3] ?? '',
  }));
}

/** Get all members from the Members sheet */
export async function getMembers(): Promise<Member[]> {
  const members = await getMembersUnsorted();

  // Programmatic sort by Name, then ID number
  members.sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    if (nameCompare !== 0) return nameCompare;
    const numA = parseInt(a.memberId.replace(/^\D+/g, ''), 10) || 0;
    const numB = parseInt(b.memberId.replace(/^\D+/g, ''), 10) || 0;
    return numA - numB;
  });

  return members;
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

  // Fetch Row 1 headers to determine how many dates we have
  const headersResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${SHEETS.ATTENDANCE}!1:1`,
  });
  const headers = headersResponse.data.values?.[0] ?? ['Name'];
  if (headers.length > 1) {
    const numPastDates = headers.length - 1;
    const pastAbsentValues = Array(numPastDates).fill('Absent');
    const lastColLetter = getColumnLetter(headers.length);
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSheetId(),
      range: `${SHEETS.ATTENDANCE}!B${nextRow}:${lastColLetter}${nextRow}`,
      valueInputOption: 'RAW',
      requestBody: { values: [pastAbsentValues] },
    });
  }

  // 3. Sort sheets to arrange alphabetically
  await sortSheets();

  return { memberId: nextId, name, email, createdAt };
}
