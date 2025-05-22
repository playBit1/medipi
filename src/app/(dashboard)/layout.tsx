//This file implements a protected layout wrapper that checks for authentication
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
