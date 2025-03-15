import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/db';
import User from '@/models/User';

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await connectDB();

    // Borrar todos los usuarios con rol 'student'
    const result = await User.deleteMany({ role: 'student' });

    return NextResponse.json({
      message: 'Estudiantes eliminados correctamente',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error al eliminar estudiantes:', error);
    return NextResponse.json(
      { error: 'Error al eliminar estudiantes' },
      { status: 500 }
    );
  }
} 