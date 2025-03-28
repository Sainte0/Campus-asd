import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import connectDB from '@/lib/db';
import StudentRequest from '@/models/StudentRequest';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    await connectDB();

    const studentRequest = await StudentRequest.findById(params.id);
    if (!studentRequest) {
      return NextResponse.json(
        { message: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    // Crear el usuario con el documento como contraseña inicial
    const user = await User.create({
      email: studentRequest.email,
      name: `${studentRequest.nombre} ${studentRequest.apellido}`,
      documento: studentRequest.documento,
      password: await bcrypt.hash(studentRequest.documento, 10),
      role: 'student',
    });

    // Actualizar el estado de la solicitud
    studentRequest.status = 'approved';
    await studentRequest.save();

    return NextResponse.json({
      message: 'Solicitud aprobada exitosamente',
      user
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    return NextResponse.json(
      { message: 'Error al aprobar la solicitud' },
      { status: 500 }
    );
  }
} 