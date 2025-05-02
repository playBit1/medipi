// src/components/providers/NextAuthProvider.tsx
/*This client component wraps the application with the NextAuth SessionProvider, making authentication state available to all client components. 
It enables components to access session data and authentication functions like signIn and signOut. */
'use client';

import { SessionProvider } from 'next-auth/react';

export default function NextAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
