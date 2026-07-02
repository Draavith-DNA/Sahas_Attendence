// ============================================
// Sahas Attendance — Dashboard Layout (Auth Guard)
// ============================================

import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import MobileNav from '@/components/MobileNav';
import OfflineIndicator from '@/components/OfflineIndicator';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authed = await isAuthenticated();
  if (!authed) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <OfflineIndicator />
      <main className="flex-1 pb-20 overflow-y-auto">{children}</main>
      <MobileNav />
    </div>
  );
}
