/*This file configures NextAuth.js to handle authentication routes in the Next.js App Router. It serves as the API endpoint for login, 
logout, and session management. It connects to the authentication logic defined in the auth.ts file and makes those capabilities available as API routes.*/
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
