import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    console.log('Iniciando conexión a MongoDB...');
    await connectDB();
    console.log('Conexión a MongoDB establecida');

    // Crear usuario administrador por defecto
    const adminPassword = await bcrypt.hash('admin123', 10);
    console.log('Password hasheado correctamente');

    const adminData = {
      email: 'admin@campus.com',
      password: adminPassword,
      name: 'Administrador',
      role: 'admin' as const,
      passwordChanged: false
    };

    console.log('Buscando admin existente...');
    let admin;
    try {
      admin = await User.findOneAndUpdate(
        { email: adminData.email },
        { ...adminData },
        { upsert: true, new: true }
      );
      console.log('Admin creado/actualizado:', admin.email);
    } catch (error) {
      console.error('Error al crear/actualizar admin:', error);
      throw new Error('Error al crear/actualizar admin');
    }

    // Crear usuario estudiante de prueba
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentData = {
      email: 'student@campus.com',
      password: studentPassword,
      name: 'Estudiante',
      role: 'student' as const,
      passwordChanged: false
    };

    console.log('Creando/actualizando estudiante de prueba...');
    let student;
    try {
      student = await User.findOneAndUpdate(
        { email: studentData.email },
        { ...studentData },
        { upsert: true, new: true }
      );
      console.log('Estudiante creado/actualizado:', student.email);
    } catch (error) {
      console.error('Error al crear/actualizar estudiante:', error);
      throw new Error('Error al crear/actualizar estudiante');
    }

    return NextResponse.json({
      message: 'Usuarios inicializados correctamente',
      users: {
        admin: {
          email: admin.email,
          role: admin.role
        },
        student: {
          email: student.email,
          role: student.role
        }
      }
    });
  } catch (error) {
    console.error('Error en la inicialización de usuarios:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 