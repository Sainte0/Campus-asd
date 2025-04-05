import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function POST(request: Request) {
  try {
    const { email, documento } = await request.json();

    if (!email || !documento) {
      return NextResponse.json(
        { message: 'Se requiere email y documento' },
        { status: 400 }
      );
    }

    await connectDB();

    // Buscar el usuario por email
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { message: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el documento y la contraseña
    const hashedPassword = await bcrypt.hash(documento, 10);
    
    user.documento = documento;
    user.password = hashedPassword;
    
    await user.save();

    return NextResponse.json({
      message: 'Contraseña actualizada correctamente',
      email: user.email
    });
  } catch (error) {
    console.error('Error al restablecer contraseña:', error);
    return NextResponse.json(
      { message: 'Error al restablecer la contraseña' },
      { status: 500 }
    );
  }
} 