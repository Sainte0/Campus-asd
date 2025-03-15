import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import Section from '@/models/Section';
import { authOptions } from '../auth/[...nextauth]/route';

// GET /api/sections - Obtener todas las secciones
export async function GET() {
  try {
    await connectDB();
    const sections = await Section.find().sort({ weekNumber: 1 });
    return NextResponse.json(sections);
  } catch (error) {
    console.error('Error al obtener secciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener las secciones' },
      { status: 500 }
    );
  }
}

// POST /api/sections - Crear una nueva sección
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    // Verificar si el usuario está autenticado y es administrador
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado - Se requieren permisos de administrador' },
        { status: 401 }
      );
    }

    await connectDB();
    const data = await request.json();
    
    const section = await Section.create(data);
    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('Error al crear sección:', error);
    return NextResponse.json(
      { error: 'Error al crear la sección' },
      { status: 500 }
    );
  }
} 