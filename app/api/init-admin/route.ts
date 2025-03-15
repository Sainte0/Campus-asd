import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await connectDB();

    // Crear o actualizar usuario administrador
    const adminData = {
      email: 'admin@campus.com',
      password: await bcrypt.hash('admin123', 10),
      name: 'Administrador',
      role: 'admin' as const,
      passwordChanged: false
    };

    const admin = await User.findOneAndUpdate(
      { email: adminData.email },
      adminData,
      { upsert: true, new: true }
    );

    // Crear o actualizar usuario estudiante
    const studentData = {
      email: 'student@campus.com',
      password: await bcrypt.hash('student123', 10),
      name: 'Estudiante',
      role: 'student' as const,
      passwordChanged: false
    };

    const student = await User.findOneAndUpdate(
      { email: studentData.email },
      studentData,
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      users: {
        admin: { email: admin.email, role: admin.role },
        student: { email: student.email, role: student.role }
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al inicializar usuarios' },
      { status: 500 }
    );
  }
} 