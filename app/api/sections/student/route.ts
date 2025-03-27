import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'student') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Obtener el estudiante para obtener su eventId
    const student = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!student || !student.eventId) {
      return NextResponse.json(
        { error: 'No se encontró el evento asignado al estudiante' },
        { status: 404 }
      );
    }

    // Obtener las secciones del evento del estudiante
    const sections = await db.collection('sections')
      .find({ eventId: student.eventId })
      .sort({ weekNumber: 1 })
      .toArray();

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error al obtener secciones del estudiante:', error);
    return NextResponse.json(
      { error: 'Error al obtener las secciones' },
      { status: 500 }
    );
  }
} 