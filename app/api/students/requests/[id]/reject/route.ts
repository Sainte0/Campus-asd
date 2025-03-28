import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import connectDB from '@/lib/db';
import StudentRequest from '@/models/StudentRequest';

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

    // Actualizar el estado de la solicitud
    studentRequest.status = 'rejected';
    await studentRequest.save();

    return NextResponse.json({
      message: 'Solicitud rechazada exitosamente'
    });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    return NextResponse.json(
      { message: 'Error al rechazar la solicitud' },
      { status: 500 }
    );
  }
} 