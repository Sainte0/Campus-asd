import 'next-auth';
import { DefaultSession } from 'next-auth';
import NextAuth from 'next-auth';

declare module 'next-auth' {
  interface User {
    role: string;
    documento: string;
    eventId: string;
  }

  interface Session {
    user: {
      role: string;
      documento: string;
      eventId: string;
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    documento: string;
    eventId: string;
  }
} 