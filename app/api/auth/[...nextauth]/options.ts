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
    documento?: string;
  }
  interface Session {
    user: {
      role: string;
      documento?: string;
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    documento?: string;
  }
}

export const options: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password/Documento", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Faltan credenciales:', { email: credentials?.email, password: '***' });
            return null;
          }

          console.log('🔄 Conectando a MongoDB...');
          await connectDB();
          console.log('✅ Conexión establecida');
          
          console.log('🔍 Buscando usuario:', credentials.email);
          const user = await User.findOne({ email: credentials.email }) as IUser | null;
          
          if (!user) {
            console.log('❌ Usuario no encontrado:', credentials.email);
            return null;
          }

          // Si es admin, verificar contraseña normal
          if (user.role === 'admin') {
            console.log('🔐 Verificando contraseña de admin...');
            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) {
              console.log('❌ Contraseña inválida para admin:', credentials.email);
              return null;
            }
          } 
          // Si es estudiante, verificar que el documento coincida
          else {
            console.log('🔐 Verificando documento de estudiante...');
            const isValid = await bcrypt.compare(credentials.password, user.password);
            if (!isValid) {
              console.log('❌ Documento inválido para estudiante:', credentials.email);
              return null;
            }
          }

          console.log('✅ Login exitoso para:', credentials.email, 'Role:', user.role);
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
        if (user.role === 'student') {
          token.documento = user.documento;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        if (token.role === 'student') {
          session.user.documento = token.documento;
        }
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
  debug: true,
  secret: process.env.NEXTAUTH_SECRET,
}; 