// ============================================
// Sahas Attendance — Next.js Route Middleware
// ============================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const AUTH_COOKIE_NAME = 'sahas-auth';

function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Guard all dashboard pages and sub-routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        // Fail-safe redirect if JWT secret environment variable is missing
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      // Verify token authenticity
      await jwtVerify(token, getSecretKey(secret));
      return NextResponse.next();
    } catch {
      // Invalid/Expired token: Clear cookie and redirect to login
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(AUTH_COOKIE_NAME);
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
