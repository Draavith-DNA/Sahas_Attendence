// ============================================
// Sahas Attendance — Members API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { AUTH_COOKIE_NAME } from '@/lib/constants';
import { getMembers, addMember, ensureSheetStructure } from '@/lib/google-sheets';

import { promises as dns } from 'dns';

// Common disposable/temp email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'yopmail.com', 'tempmail.com', 'temp-mail.org',
  '10minutemail.com', 'guerrillamail.com', 'dispostable.com',
  'trashmail.com', 'sharklasers.com', 'getairmail.com',
  'burnermail.io', 'generator.email', 'maildrop.cc',
  'fakeinbox.com', 'throwawaymail.com', 'tempmailaddress.com'
]);

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

async function validateEmailAddress(email: string): Promise<{ isValid: boolean; error?: string }> {
  // 1. Basic format validation
  if (!EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Invalid email address format.' };
  }

  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) {
    return { isValid: false, error: 'Invalid email domain.' };
  }

  // 2. Block disposable email providers
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, error: 'Temporary or disposable emails are not allowed.' };
  }

  // 3. DNS MX Record Lookup
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { isValid: false, error: 'Email domain does not exist or cannot receive mail.' };
    }
  } catch {
    // Check if DNS resolution failed due to being offline or target domain failure
    try {
      const test = await dns.resolveMx('google.com');
      if (test && test.length > 0) {
        // We have connectivity, so the target domain is invalid
        return { isValid: false, error: 'Email domain cannot be verified.' };
      }
    } catch {
      // Offline/Local DNS block: bypass MX check to allow local developer testing
      return { isValid: true };
    }
    return { isValid: false, error: 'Email domain cannot be verified.' };
  }

  return { isValid: true };
}

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
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
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

    const emailStr = (email || '').trim();
    const emailValidation = await validateEmailAddress(emailStr);
    if (!emailValidation.isValid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }

    await ensureSheetStructure();
    const member = await addMember(name.trim(), emailStr);

    return NextResponse.json({ success: true, member });
  } catch (error) {
    console.error('Members POST error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
