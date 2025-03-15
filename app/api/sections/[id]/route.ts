import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/db';
import Section from '@/models/Section';
import { authOptions } from '../../auth/[...nextauth]/route';

// PUT /api/sections/[id] - Actualizar una sección
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado - Se requieren permisos de administrador' },
        { status: 401 }
      );
    }

    await connectDB();
    const data = await request.json();
    
    const section = await Section.findByIdAndUpdate(
      params.id,
      data,
      { new: true, runValidators: true }
    );

    if (!section) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(section);
  } catch (error) {
    console.error('Error al actualizar sección:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la sección' },
      { status: 500 }
    );
  }
}

// DELETE /api/sections/[id] - Eliminar una sección
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado - Se requieren permisos de administrador' },
        { status: 401 }
      );
    }

    await connectDB();
    const section = await Section.findByIdAndDelete(params.id);

    if (!section) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Sección eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar sección:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la sección' },
      { status: 500 }
    );
  }
} 