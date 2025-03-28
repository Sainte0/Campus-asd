import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import connectDB from '@/lib/db';
import StudentRequest from '@/models/StudentRequest';

export async function DELETE(
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

    const studentRequest = await StudentRequest.findByIdAndDelete(params.id);
    if (!studentRequest) {
      return NextResponse.json(
        { message: 'Solicitud no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Solicitud eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar solicitud:', error);
    return NextResponse.json(
      { message: 'Error al eliminar la solicitud' },
      { status: 500 }
    );
  }
} 