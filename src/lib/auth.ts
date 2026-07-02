// ============================================
// Sahas Attendance — JWT Authentication Utilities
// ============================================

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, JWT_EXPIRY_SECONDS } from './constants';

/** Encode secret string into Uint8Array for jose */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

/** Create a signed JWT token for an authenticated admin */
export async function createToken(): Promise<string> {
  const token = await new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_SECONDS}s`)
    .sign(getSecretKey());
  return token;
}

/** Verify a JWT token and return the payload, or null if invalid */
export async function verifyToken(token: string): Promise<{ role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as { role: string };
  } catch {
    return null;
  }
}

/** Validate the admin PIN against the environment variable */
export function validatePin(pin: string): boolean {
  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) throw new Error('ADMIN_PIN environment variable is not set');
  return pin === adminPin;
}

/** Check if the current request has a valid auth cookie (for server components) */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload !== null;
}
