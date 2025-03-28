import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import StudentRequest from '@/models/StudentRequest';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nombre, apellido, email, documento } = body;

    // Validar campos requeridos
    if (!nombre || !apellido || !email || !documento) {
      return NextResponse.json(
        { message: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    await connectDB();

    // Crear nueva solicitud
    const studentRequest = await StudentRequest.create({
      nombre,
      apellido,
      email,
      documento,
      status: 'pending'
    });

    return NextResponse.json(
      { message: 'Solicitud creada exitosamente', data: studentRequest },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { message: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
} 