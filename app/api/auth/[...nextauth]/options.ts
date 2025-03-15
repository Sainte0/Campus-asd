import { AuthOptions, DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { User as AuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User, { IUser } from '@/models/User';
import { Document, Types } from 'mongoose';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: string;
  }
  
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: string;
  }
}

interface Credentials {
  email: string;
  password: string;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<AuthUser | null> {
        try {
          if (!credentials) {
            throw new Error('No se proporcionaron credenciales');
          }

          const { email, password } = credentials as Credentials;
          
          if (!email || !password) {
            console.log('Credenciales incompletas');
            throw new Error('Por favor ingrese email y contraseña');
          }

          console.log('Iniciando autenticación para:', email);

          await connectDB();
          console.log('Conexión a MongoDB exitosa');

          const userDoc = await User.findOne({ email })
            .select('+password')
            .lean()
            .exec();

          if (!userDoc) {
            console.log('Usuario no encontrado:', email);
            return null;
          }

          // Asegurarnos de que userDoc tiene la estructura correcta
          if (!userDoc._id || !userDoc.email || !userDoc.name || !userDoc.role || !userDoc.password) {
            console.log('Datos de usuario inválidos');
            return null;
          }

          console.log('Usuario encontrado, verificando contraseña...');
          const isValid = await bcrypt.compare(password, userDoc.password);

          if (!isValid) {
            console.log('Contraseña incorrecta para:', email);
            return null;
          }

          console.log('Autenticación exitosa para:', email);

          // Asegurarse de que el _id es una cadena
          const userId = userDoc._id instanceof Types.ObjectId 
            ? userDoc._id.toString() 
            : String(userDoc._id);

          return {
            id: userId,
            email: userDoc.email,
            name: userDoc.name,
            role: userDoc.role
          };
        } catch (error) {
          console.error('Error en autenticación:', error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.name = token.name;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/',
    error: '/'
  },
  debug: true
}; 