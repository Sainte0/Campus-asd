import { AuthOptions, DefaultSession } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { User as AuthUser } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User, { IUser } from '@/models/User';
import { Types } from 'mongoose';

declare module 'next-auth' {
  interface CustomUser extends AuthUser {
    role: string;
  }
  
  interface Session {
    user: {
      role: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log('Iniciando autenticación para:', credentials?.email);
          
          if (!credentials?.email || !credentials?.password) {
            console.log('Credenciales incompletas');
            throw new Error('Por favor ingrese email y contraseña');
          }

          // Intentar conectar a MongoDB con reintentos
          let retries = 3;
          let lastError;
          
          while (retries > 0) {
            try {
              console.log(`Intento de conexión a MongoDB (intentos restantes: ${retries})`);
              await connectDB();
              console.log('Conexión a MongoDB exitosa');
              break;
            } catch (error) {
              lastError = error;
              retries--;
              console.error(`Error en intento de conexión:`, error);
              if (retries > 0) {
                console.log('Esperando antes del siguiente intento...');
                await new Promise(resolve => setTimeout(resolve, 1000));
              }
            }
          }

          if (retries === 0) {
            console.error('Failed to connect to MongoDB after retries:', lastError);
            throw new Error('Error de conexión con la base de datos');
          }

          console.log('Buscando usuario en la base de datos...');
          const user = await User.findOne({ email: credentials.email })
            .select('+password')
            .exec() as IUser;

          if (!user) {
            console.log('Usuario no encontrado:', credentials.email);
            throw new Error('Usuario no encontrado');
          }

          console.log('Usuario encontrado, verificando contraseña...');
          const isValid = await bcrypt.compare(credentials.password, user.password);

          if (!isValid) {
            console.log('Contraseña incorrecta para:', credentials.email);
            throw new Error('Contraseña incorrecta');
          }

          console.log('Autenticación exitosa para:', credentials.email);
          return {
            id: (user as IUser)._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role
          };
        } catch (error) {
          console.error('Error en autenticación:', error);
          throw error;
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
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string;
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