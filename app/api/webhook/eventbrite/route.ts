import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Webhook recibido:', data);

    // Verificar que es un evento de orden
    if (!['order.placed', 'order.updated', 'order.completed'].includes(data.action)) {
      console.log('Evento ignorado:', data.action);
      return NextResponse.json({ message: 'Evento ignorado' });
    }

    await connectDB();

    // Para pruebas locales, usar directamente los datos del mock
    let attendeeData = data.attendee;

    // Si es una llamada real de Eventbrite, obtener los datos del asistente
    if (!attendeeData && data.order_id) {
      const attendeeResponse = await fetch(
        `https://www.eventbriteapi.com/v3/orders/${data.order_id}/attendees/`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!attendeeResponse.ok) {
        console.error('Error al obtener datos de Eventbrite:', await attendeeResponse.text());
        throw new Error('Error al obtener datos del asistente de Eventbrite');
      }

      const attendeesData = await attendeeResponse.json();
      attendeeData = attendeesData.attendees[0];
    }

    if (!attendeeData || !attendeeData.profile) {
      throw new Error('Datos del asistente no válidos');
    }

    // Verificar si el usuario ya existe
    let user = await User.findOne({ email: attendeeData.profile.email });

    if (user) {
      // Actualizar usuario existente
      user.name = attendeeData.profile.name;
      user.eventbriteId = attendeeData.id;
      await user.save();
      console.log('Usuario actualizado:', attendeeData.profile.email);

      return NextResponse.json({
        message: 'Usuario actualizado correctamente',
        action: 'updated'
      });
    }

    // Crear contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Crear nuevo usuario
    user = await User.create({
      name: attendeeData.profile.name,
      email: attendeeData.profile.email,
      password: hashedPassword,
      role: 'student',
      eventbriteId: attendeeData.id,
      tempPassword: tempPassword,
      passwordChanged: false
    });

    console.log('Nuevo usuario creado:', {
      email: attendeeData.profile.email,
      tempPassword: tempPassword
    });

    return NextResponse.json({
      message: 'Usuario creado correctamente',
      action: 'created',
      credentials: {
        email: attendeeData.profile.email,
        tempPassword: tempPassword
      }
    });

  } catch (error) {
    console.error('Error en webhook de Eventbrite:', error);
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    );
  }
}

// Verificación de webhook
export async function GET() {
  return NextResponse.json({ 
    status: 'Webhook endpoint activo',
    eventId: process.env.EVENTBRITE_EVENT_ID
  });
} 