import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import Section from '@/models/Section';
import { authOptions } from '../auth/config';

// GET /api/sections - Obtener todas las secciones
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const eventId = searchParams.get('eventId');
    const skip = (page - 1) * limit;

    const { db } = await connectToDatabase();
    
    // Construir el filtro basado en el eventId
    const filter = eventId ? { eventId } : {};
    
    // Obtener el total de documentos para la paginación
    const total = await db.collection('sections').countDocuments(filter);
    
    // Obtener las secciones con paginación y ordenadas por número de semana
    const sections = await db.collection('sections')
      .find(filter)
      .sort({ weekNumber: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return NextResponse.json({
      sections,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit
      }
    });
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

    const { db } = await connectToDatabase();
    const data = await request.json();
    
    // Crear la nueva sección
    const result = await db.collection('sections').insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Obtener la sección recién creada
    const newSection = await db.collection('sections').findOne({
      _id: result.insertedId
    });

    return NextResponse.json(newSection, { status: 201 });
  } catch (error) {
    console.error('Error al crear sección:', error);
    return NextResponse.json(
      { error: 'Error al crear la sección' },
      { status: 500 }
    );
  }
} 