import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';
import { ObjectId } from 'mongodb';

// PUT /api/sections/[id] - Actualizar una sección
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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
    const { id } = params;

    // Actualizar la sección
    const result = await db.collection('sections').findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Sección no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
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
    
    // Verificar si el usuario está autenticado y es administrador
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado - Se requieren permisos de administrador' },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const { id } = params;

    // Eliminar la sección
    const result = await db.collection('sections').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
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