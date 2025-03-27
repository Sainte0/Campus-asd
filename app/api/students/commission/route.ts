import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const commission = searchParams.get('commission');
    const eventId = searchParams.get('eventId');

    if (!commission || !eventId) {
      return NextResponse.json(
        { error: 'Se requiere el nombre de la comisión y el ID del evento' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const students = await User.find({
      eventId,
      commission
    }).select('name email documento');

    return NextResponse.json({ students });
  } catch (error) {
    console.error('Error al obtener estudiantes de la comisión:', error);
    return NextResponse.json(
      { error: 'Error al obtener los estudiantes de la comisión' },
      { status: 500 }
    );
  }
} 