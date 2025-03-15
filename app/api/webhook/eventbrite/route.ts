import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

interface EventbriteProfile {
  name: string;
  email: string;
  first_name: string;
  last_name: string;
  answers?: {
    question_id: string;
    answer: string;
  }[];
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
  const startTime = new Date();
  console.log('🔵 Webhook iniciado:', startTime.toISOString());

  try {
    const payload = await request.json() as EventbriteWebhookPayload;
    console.log('📥 Webhook recibido:', {
      action: payload.action,
      attendee: payload.attendee?.profile?.email,
      orderId: payload.order_id,
      timestamp: new Date().toISOString()
    });

    // Verificar que es un evento válido
    const validActions = [
      'order.placed',
      'order.updated',
      'attendee.updated',
      'attendee.created',
      'attendee.checked_in',
      'attendee.checked_out'
    ];

    if (!validActions.includes(payload.action)) {
      console.log('⚠️ Acción ignorada:', payload.action);
      return NextResponse.json({ 
        message: 'Acción ignorada',
        action: payload.action,
        validActions
      });
    }

    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión a MongoDB establecida');

    // Si es un evento de orden, necesitamos obtener los datos del asistente
    let attendeeData = payload.attendee;
    if (!attendeeData && payload.order_id) {
      console.log('🔍 Buscando datos del asistente para la orden:', payload.order_id);
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
          throw new Error(`Error al obtener datos de Eventbrite: ${response.status}`);
        }

        const data = await response.json();
        attendeeData = data.attendees[0];
        console.log('✅ Datos del asistente obtenidos:', {
          email: attendeeData?.profile?.email,
          name: attendeeData?.profile?.name
        });
      } catch (error) {
        console.error('❌ Error al obtener datos del asistente:', error);
        return NextResponse.json(
          { error: 'Error al obtener datos del asistente' },
          { status: 500 }
        );
      }
    }

    if (!attendeeData || !attendeeData.profile) {
      console.error('❌ Datos del asistente no válidos:', attendeeData);
      return NextResponse.json(
        { error: 'Datos del asistente no válidos' },
        { status: 400 }
      );
    }

    // Mostrar todas las preguntas y sus IDs
    console.log('📝 Preguntas del formulario:', 
      attendeeData.profile.answers?.map(answer => ({
        question_id: answer.question_id,
        answer: answer.answer
      }))
    );

    // Obtener el documento del asistente de las respuestas del formulario
    const documentoAnswer = attendeeData.profile.answers?.find(
      answer => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
    );

    if (!documentoAnswer?.answer) {
      console.error('❌ No se encontró el documento del asistente');
      return NextResponse.json(
        { error: 'No se encontró el documento del asistente' },
        { status: 400 }
      );
    }

    const documento = documentoAnswer.answer.trim();
    const hashedPassword = await bcrypt.hash(documento, 10);

    // Verificar si el usuario ya existe
    console.log('🔍 Verificando si el usuario existe:', attendeeData.profile.email);
    const existingUser = await User.findOne({
      $or: [
        { email: attendeeData.profile.email },
        { eventbriteId: attendeeData.id },
        { documento: documento }
      ]
    });

    if (existingUser) {
      console.log('📝 Actualizando usuario existente:', attendeeData.profile.email);
      // Actualizar usuario existente
      await User.findByIdAndUpdate(existingUser._id, {
        name: attendeeData.profile.name,
        eventbriteId: attendeeData.id,
        // No actualizamos la contraseña ya que siempre debe ser el documento
        ...(payload.action === 'attendee.checked_in' && { status: 'checked_in' }),
        ...(payload.action === 'attendee.checked_out' && { status: 'checked_out' })
      });

      console.log('✅ Usuario actualizado correctamente');
      return NextResponse.json({
        message: 'Usuario actualizado correctamente',
        action: 'updated',
        email: attendeeData.profile.email
      });
    }

    // Solo crear nuevo usuario para order.placed, attendee.created y attendee.updated
    if (!['order.placed', 'attendee.created', 'attendee.updated'].includes(payload.action)) {
      console.log('ℹ️ No se requiere crear usuario para esta acción:', payload.action);
      return NextResponse.json({
        message: 'No se requiere crear usuario para esta acción',
        action: payload.action
      });
    }

    // Crear nuevo usuario
    console.log('👤 Creando nuevo usuario:', attendeeData.profile.email);
    const newUser = await User.create({
      name: attendeeData.profile.name,
      email: attendeeData.profile.email,
      password: hashedPassword,
      role: 'student',
      eventbriteId: attendeeData.id,
      documento: documento,
      status: payload.action === 'attendee.checked_in' ? 'checked_in' : 'registered'
    });

    console.log('✅ Usuario creado exitosamente:', {
      email: attendeeData.profile.email,
      documento: documento,
      timestamp: new Date().toISOString()
    });

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    console.log(`🏁 Webhook completado en ${duration}ms`);

    return NextResponse.json({
      message: 'Usuario creado correctamente',
      action: 'created',
      email: attendeeData.profile.email
    });

  } catch (error) {
    console.error('❌ Error en webhook de Eventbrite:', error);
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
      'attendee.created',
      'attendee.updated',
      'attendee.checked_in',
      'attendee.checked_out'
    ]
  });
} 