import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';

// Función auxiliar para determinar el instructor basado en la comisión
function getInstructorFromCommission(commission: string): 'marion' | 'david' {
  // Convertir a minúsculas para hacer la comparación insensible a mayúsculas
  const commissionLower = commission.toLowerCase();
  
  // Comisiones de David
  if (commissionLower.includes('comisión 1 presencial') || 
      commissionLower.includes('comisión 1 streaming') ||
      commissionLower.includes('comisión 2 presencial') ||
      commissionLower.includes('comisión 2 streaming') ||
      commissionLower.includes('comisión 4 presencial') ||
      commissionLower.includes('comisión 4 streaming')) {
    return 'david';
  }
  
  // Comisiones de Marion
  if (commissionLower.includes('comisión 11 presencial') || 
      commissionLower.includes('comisión 11 streaming') ||
      commissionLower.includes('comisión 12 presencial') || 
      commissionLower.includes('comisión 12 streaming') ||
      commissionLower.includes('sábado online - 05/04/2025 9 a 13hs marion') ||
      commissionLower.includes('sabado online - 05/04/2025 9 a 13hs marion') ||
      commissionLower.includes('sábado online')) {
    return 'marion';
  }

  // Por defecto, si no se puede determinar, asignar a Marion
  return 'marion';
}

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

    if (!student) {
      return NextResponse.json(
        { error: 'No se encontró el estudiante' },
        { status: 404 }
      );
    }

    // Si la comisión es "Modalidad Libre con Acceso a Contenidos", usar el Evento 2
    const isEvent2 = student.commission?.toLowerCase().includes('modalidad libre con acceso a contenidos');
    const eventId = isEvent2
      ? process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2
      : student.eventId;

    if (!eventId) {
      return NextResponse.json(
        { error: 'No se encontró el evento asignado al estudiante' },
        { status: 404 }
      );
    }

    // Determinar el instructor basado en la comisión del estudiante
    const instructor = getInstructorFromCommission(student.commission || '');

    // Construir el filtro de búsqueda
    const filter: any = { eventId };

    // Solo filtrar por instructor si no es el Evento 2
    if (!isEvent2) {
      filter.instructor = instructor;
    }

    // Obtener las secciones del evento del estudiante
    const sections = await db.collection('sections')
      .find(filter)
      .sort({ weekNumber: 1 })
      .toArray();

    // Verificar si hay secciones
    if (!sections || sections.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron secciones para este estudiante' },
        { status: 404 }
      );
    }

    return NextResponse.json({ sections });
  } catch (error) {
    console.error('Error al obtener secciones del estudiante:', error);
    return NextResponse.json(
      { error: 'Error al obtener las secciones' },
      { status: 500 }
    );
  }
} 