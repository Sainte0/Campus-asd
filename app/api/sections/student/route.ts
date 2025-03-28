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
    
    // Obtener el estudiante para obtener su eventId y commission
    const student = await db.collection('users').findOne({
      email: session.user.email
    });

    if (!student || !student.eventId) {
      return NextResponse.json(
        { error: 'No se encontró el evento asignado al estudiante' },
        { status: 404 }
      );
    }

    // Determinar el instructor basado en la comisión del estudiante
    let instructor = '';
    if (student.commission) {
      if (student.commission.includes('marion') || 
          student.commission.includes('Marion') || 
          student.commission.includes('MARION')) {
        instructor = 'marion';
      } else if (student.commission.includes('david') || 
                 student.commission.includes('David') || 
                 student.commission.includes('DAVID')) {
        instructor = 'david';
      }
    }

    if (!instructor) {
      return NextResponse.json(
        { error: 'No se pudo determinar el instructor para la comisión del estudiante' },
        { status: 400 }
      );
    }

    // Obtener las secciones del evento del estudiante filtradas por instructor
    const sections = await db.collection('sections')
      .find({ 
        eventId: student.eventId,
        instructor: instructor
      })
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