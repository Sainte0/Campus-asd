'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/components/AuthProvider';

export function RootLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SessionProvider>
  );
} 