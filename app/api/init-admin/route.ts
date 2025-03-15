import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST() {
  try {
    await connectDB();

    // Crear usuario administrador por defecto
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { email: 'admin@campus.com' },
      {
        email: 'admin@campus.com',
        password: adminPassword,
        name: 'Administrador',
        role: 'admin',
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ message: 'Administrador inicializado correctamente' });
  } catch (error) {
    console.error('Error al inicializar administrador:', error);
    return NextResponse.json(
      { error: 'Error al inicializar administrador' },
      { status: 500 }
    );
  }
} 