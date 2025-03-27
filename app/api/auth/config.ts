import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { Types } from 'mongoose';

interface MongoUser {
  _id: Types.ObjectId;
  email: string;
  name: string;
  role: string;
  documento: string;
  eventId: string;
  password?: string;
  eventbriteId?: string;
  status?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Por favor ingrese sus credenciales');
        }

        await connectDB();

        // Buscar usuario por email o documento
        const user = await User.findOne({
          $or: [
            { email: credentials.email },
            { documento: credentials.password }
          ]
        }) as MongoUser | null;

        if (!user) {
          throw new Error('Credenciales inválidas');
        }

        // Verificar contraseña
        let isValid = false;
        
        if (user.password) {
          // Si tiene contraseña hasheada, la comparamos
          isValid = await bcrypt.compare(credentials.password, user.password);
        } else {
          // Si no tiene contraseña hasheada, comparamos directamente con el documento
          isValid = credentials.password === user.documento;
        }

        if (!isValid) {
          throw new Error('Credenciales inválidas');
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          documento: user.documento,
          eventId: user.eventId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.documento = user.documento;
        token.eventId = user.eventId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role as string;
        session.user.documento = token.documento as string;
        session.user.eventId = token.eventId as string;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
}; 