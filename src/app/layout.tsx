// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import NextAuthProvider from '@/components/providers/NextAuthProvider';
import MqttProvider from '@/components/providers/MqttProvider';

export const metadata: Metadata = {
  title: 'MediPi - Automated Medication Dispenser',
  description: 'Secure medication dispensing system for healthcare facilities',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang='en'
      data-theme='dark'>
      <body>
        <NextAuthProvider>
          <MqttProvider>{children}</MqttProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
