import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

interface EventbriteProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface EventbriteAttendee {
  id: string;
  profile: EventbriteProfile;
  status: string;
}

interface EventbriteWebhookPayload {
  api_url: string;
  config: {
    action: string;
    endpoint_url: string;
    user_id: string;
  };
  action: string;
  attendee?: EventbriteAttendee;
  order_id?: string;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as EventbriteWebhookPayload;
    console.log('Webhook recibido:', payload.action);

    // Verificar que es un evento válido
    const validActions = [
      'order.placed',
      'order.updated',
      'attendee.updated',
      'attendee.checked_in',
      'attendee.checked_out'
    ];

    if (!validActions.includes(payload.action)) {
      console.log('Acción ignorada:', payload.action);
      return NextResponse.json({ 
        message: 'Acción ignorada',
        action: payload.action
      });
    }

    await connectDB();

    // Si es un evento de orden, necesitamos obtener los datos del asistente
    let attendeeData = payload.attendee;
    if (!attendeeData && payload.order_id) {
      try {
        const response = await fetch(
          `https://www.eventbriteapi.com/v3/orders/${payload.order_id}/attendees/`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Error al obtener datos de Eventbrite');
        }

        const data = await response.json();
        attendeeData = data.attendees[0];
      } catch (error) {
        console.error('Error al obtener datos del asistente:', error);
        return NextResponse.json(
          { error: 'Error al obtener datos del asistente' },
          { status: 500 }
        );
      }
    }

    if (!attendeeData || !attendeeData.profile) {
      return NextResponse.json(
        { error: 'Datos del asistente no válidos' },
        { status: 400 }
      );
    }

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      $or: [
        { email: attendeeData.profile.email },
        { eventbriteId: attendeeData.id }
      ]
    });

    if (existingUser) {
      // Actualizar usuario existente
      await User.findByIdAndUpdate(existingUser._id, {
        name: attendeeData.profile.name,
        eventbriteId: attendeeData.id,
        // Actualizar el estado si es un evento de check-in/out
        ...(payload.action === 'attendee.checked_in' && { status: 'checked_in' }),
        ...(payload.action === 'attendee.checked_out' && { status: 'checked_out' })
      });

      return NextResponse.json({
        message: 'Usuario actualizado correctamente',
        action: 'updated',
        email: attendeeData.profile.email
      });
    }

    // Solo crear nuevo usuario para order.placed y attendee.updated
    if (!['order.placed', 'attendee.updated'].includes(payload.action)) {
      return NextResponse.json({
        message: 'No se requiere crear usuario para esta acción',
        action: payload.action
      });
    }

    // Crear contraseña temporal
    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Crear nuevo usuario
    const newUser = await User.create({
      name: attendeeData.profile.name,
      email: attendeeData.profile.email,
      password: hashedPassword,
      role: 'student',
      eventbriteId: attendeeData.id,
      tempPassword: tempPassword,
      passwordChanged: false,
      status: payload.action === 'attendee.checked_in' ? 'checked_in' : 'registered'
    });

    console.log('Nuevo usuario creado:', {
      email: attendeeData.profile.email,
      tempPassword: tempPassword
    });

    return NextResponse.json({
      message: 'Usuario creado correctamente',
      action: 'created',
      email: attendeeData.profile.email
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
    eventId: process.env.EVENTBRITE_EVENT_ID,
    validActions: [
      'order.placed',
      'order.updated',
      'attendee.updated',
      'attendee.checked_in',
      'attendee.checked_out'
    ]
  });
} 