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
    const existingAdmin = await User.findOne({ email: adminData.email });

    let admin;
    if (existingAdmin) {
      console.log('Actualizando admin existente...');
      admin = await User.findOneAndUpdate(
        { email: adminData.email },
        { ...adminData },
        { new: true }
      );
    } else {
      console.log('Creando nuevo admin...');
      admin = await User.create(adminData);
    }

    console.log('Admin creado/actualizado:', admin);

    // También crear un usuario estudiante de prueba
    const studentPassword = await bcrypt.hash('student123', 10);
    const studentData = {
      email: 'student@campus.com',
      password: studentPassword,
      name: 'Estudiante',
      role: 'student' as const,
      passwordChanged: false
    };

    console.log('Creando/actualizando estudiante de prueba...');
    await User.findOneAndUpdate(
      { email: studentData.email },
      { ...studentData },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      message: 'Usuarios inicializados correctamente',
      adminEmail: adminData.email,
      studentEmail: studentData.email
    });
  } catch (error) {
    console.error('Error al inicializar usuarios:', error);
    return NextResponse.json(
      { error: 'Error al inicializar usuarios', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 