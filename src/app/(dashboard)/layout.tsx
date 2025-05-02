// src/app/(dashboard)/layout.tsx
/*This file implements a protected layout wrapper that checks for authentication on the server side and redirects unauthenticated users to the login page.
 It applies the MainLayout component to all dashboard routes, ensuring consistent layout and protection for all administrative pages. */
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import MainLayout from '@/components/layout/MainLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return <MainLayout>{children}</MainLayout>;
}
