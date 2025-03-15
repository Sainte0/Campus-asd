import type { NextAuthOptions, DefaultSession } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User, { IUser } from '@/models/User';
import { Types } from 'mongoose';

// Extender los tipos de NextAuth
declare module "next-auth" {
  interface User {
    role: string;
    documento: string;
  }
  interface Session {
    user: {
      role: string;
      documento: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    documento: string;
  }
}

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        documento: { label: "Documento", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.documento) {
          console.log('❌ Faltan credenciales');
          return null;
        }

        try {
          await connectDB();
          
          const user = await User.findOne({ email: credentials.email }) as IUser | null;
          
          if (!user) {
            console.log('❌ Usuario no encontrado:', credentials.email);
            return null;
          }

          // Verificar que el documento coincida
          const isValid = await bcrypt.compare(credentials.documento, user.password);
          
          if (!isValid) {
            console.log('❌ Documento inválido para el usuario:', credentials.email);
            return null;
          }

          return {
            id: (user._id as Types.ObjectId).toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            documento: user.documento
          };
        } catch (error) {
          console.error('❌ Error en autenticación:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.documento = user.documento;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.documento = token.documento;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}; 