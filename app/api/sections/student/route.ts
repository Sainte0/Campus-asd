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

    if (!student || !student.eventId) {
      return NextResponse.json(
        { error: 'No se encontró el evento asignado al estudiante' },
        { status: 404 }
      );
    }

    // Determinar el instructor basado en la comisión del estudiante
    const instructor = getInstructorFromCommission(student.commission || '');

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