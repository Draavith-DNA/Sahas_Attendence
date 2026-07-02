// ============================================
// Sahas Attendance — Client Auth Hook
// ============================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Client-side auth state hook.
 * Checks auth status via /api/auth GET and provides login/logout helpers.
 */
export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check auth status on mount
  useEffect(() => {
    fetch('/api/auth')
      .then((res) => {
        setIsLoggedIn(res.ok);
      })
      .catch(() => {
        setIsLoggedIn(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /** Login with PIN code */
  const login = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        });

        if (res.ok) {
          setIsLoggedIn(true);
          router.push('/dashboard');
          return { success: true };
        } else {
          const data = await res.json();
          return { success: false, error: data.error || 'Invalid PIN' };
        }
      } catch {
        return { success: false, error: 'Network error' };
      }
    },
    [router]
  );

  /** Logout and redirect to login page */
  const logout = useCallback(async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    setIsLoggedIn(false);
    router.push('/login');
  }, [router]);

  return { isLoggedIn, isLoading, login, logout };
}
