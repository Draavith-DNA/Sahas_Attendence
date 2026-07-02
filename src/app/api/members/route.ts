// ============================================
// Sahas Attendance — Members API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import { getMembers, addMember, ensureSheetStructure } from '@/lib/google-sheets';

/** GET /api/members — Fetch all members */
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

    await ensureSheetStructure();
    const members = await getMembers();

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Members GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/members — Register a new member */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, email } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    await ensureSheetStructure();
    const member = await addMember(name.trim(), email.trim());

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Members POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
