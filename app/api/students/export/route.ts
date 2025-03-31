import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { message: 'Se requiere el ID del evento' },
        { status: 400 }
      );
    }

    await connectDB();

    const students = await User.find({ 
      role: 'student',
      eventId 
    }).select('email name');

    // Convertir a formato CSV
    const csvContent = [
      ['Email', 'Nombre'],
      ...students.map(student => [student.email, student.name])
    ].map(row => row.join(',')).join('\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="estudiantes-${eventId}.csv"`
      }
    });
  } catch (error) {
    console.error('Error al exportar estudiantes:', error);
    return NextResponse.json(
      { message: 'Error al exportar los estudiantes' },
      { status: 500 }
    );
  }
} 