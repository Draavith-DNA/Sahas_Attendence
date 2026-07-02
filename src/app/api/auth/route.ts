// ============================================
// Sahas Attendance — Auth API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createToken, validatePin, verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME, JWT_EXPIRY_SECONDS } from '@/lib/constants';

/** GET /api/auth — Check if current session is authenticated */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, role: payload.role });
}

/** POST /api/auth — Login with PIN */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ error: 'PIN is required' }, { status: 400 });
    }

    if (!validatePin(pin)) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    const token = await createToken();

    const response = NextResponse.json({ success: true });
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: JWT_EXPIRY_SECONDS,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** DELETE /api/auth — Logout */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}
