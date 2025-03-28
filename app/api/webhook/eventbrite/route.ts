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
    webhook_id: string;
  };
  action?: string;
  attendee?: EventbriteAttendee;
  order_id?: string;
  event_id?: string;
  attendee_id?: string;
}

interface ProcessResult {
  action: 'created' | 'updated' | 'skipped' | 'error';
  email: string;
  eventId: string;
  reason?: 'info_requested' | 'no_documento' | 'invalid_event';
  error?: string;
}

// Solo mantenemos las acciones que realmente necesitamos
const validActions = [
  'order.placed',  // Cuando alguien paga
  'order.updated', // Si hay cambios en la orden
  'attendee.updated', // Si hay cambios en los datos del asistente
  'test' // Webhook de prueba de Eventbrite
];

// Configuración de IDs de preguntas por evento
const EVENT_QUESTIONS: Record<string, { dniQuestionId: string }> = {
  '1300969166799': { // Evento 1
    dniQuestionId: process.env.EVENTBRITE_DNI_QUESTION_ID || '287305383'
  },
  '1301112074239': { // Evento 2
    dniQuestionId: process.env.EVENTBRITE_DNI_QUESTION_ID_2 || '287346273'
  }
};

async function getOrderAttendees(orderId: string) {
  console.log('🔍 Obteniendo asistentes de la orden:', orderId);
  
  // Ensure clean order ID
  const cleanOrderId = orderId.replace('/', '');
  const url = `https://www.eventbriteapi.com/v3/orders/${cleanOrderId}/attendees/?expand=profile,answers`;
  console.log('🌐 URL de la petición:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error obteniendo asistentes. Status:', response.status);
      console.error('📝 Error detallado:', errorText);
      throw new Error(`Error obteniendo asistentes: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Respuesta recibida:', {
      total: data.attendees?.length || 0,
      pagination: data.pagination
    });

    if (!data.attendees || !Array.isArray(data.attendees)) {
      console.error('❌ Formato de respuesta inválido:', data);
      throw new Error('Formato de respuesta inválido');
    }

    // Log event distribution
    const eventDistribution = data.attendees.reduce((acc: any, attendee: any) => {
      const eventId = attendee.event_id;
      acc[eventId] = (acc[eventId] || 0) + 1;
      return acc;
    }, {});
    console.log('📊 Distribución de asistentes por evento:', eventDistribution);

    console.log('👥 Asistentes encontrados:', data.attendees.length);
    return data.attendees;
  } catch (error) {
    console.error('❌ Error en getOrderAttendees:', error);
    throw error;
  }
}

async function processAttendee(attendee: any): Promise<ProcessResult> {
  console.log('\n👤 Procesando asistente:', attendee.profile?.email);
  
  const email = attendee.profile?.email;
  const name = `${attendee.profile?.first_name} ${attendee.profile?.last_name}`.trim();
  const eventId = attendee.event_id;
  
  console.log('📋 Detalles del asistente:', {
    email,
    name,
    eventId,
    attendeeId: attendee.id
  });
  
  // Validar si es un asistente con información pendiente
  if (name === 'Info Requested Info Requested' || email === 'Info Requested') {
    console.log('⚠️ Asistente con información pendiente, saltando...');
    return { 
      action: 'skipped', 
      email, 
      eventId,
      reason: 'info_requested'
    };
  }

  if (!email || !name) {
    throw new Error('Datos de perfil incompletos');
  }

  // Validate event ID
  if (!eventId) {
    throw new Error('No se encontró el ID del evento');
  }

  // Validate event ID is one of the expected events
  const validEventIds = [
    '1300969166799', // Evento 1
    '1301112074239'  // Evento 2
  ];
  
  if (!validEventIds.includes(eventId)) {
    console.log('⚠️ Evento no reconocido, saltando...');
    return {
      action: 'skipped',
      email,
      eventId,
      reason: 'invalid_event'
    };
  }

  // Get the correct DNI question ID for this event
  const eventConfig = EVENT_QUESTIONS[eventId];
  if (!eventConfig) {
    console.log('⚠️ No se encontró configuración para el evento:', eventId);
    return {
      action: 'skipped',
      email,
      eventId,
      reason: 'invalid_event'
    };
  }

  // Find documento in answers
  console.log('🔍 Buscando documento en respuestas');
  let documento = null;
  
  if (attendee.answers && Array.isArray(attendee.answers)) {
    console.log('📝 Respuestas disponibles:', JSON.stringify(attendee.answers, null, 2));
    const documentoAnswer = attendee.answers.find(
      (answer: any) => answer.question_id === eventConfig.dniQuestionId
    );
    if (documentoAnswer) {
      documento = documentoAnswer.answer;
      console.log('✅ Documento encontrado:', documento);
    }
  }

  if (!documento) {
    console.log('⚠️ No se encontró documento para:', email);
    return { 
      action: 'skipped', 
      email, 
      eventId,
      reason: 'no_documento'
    };
  }

  // Create or update user
  const existingUser = await User.findOne({ email });
  
  if (existingUser) {
    console.log('📝 Actualizando usuario existente:', email);
    existingUser.name = name;
    existingUser.documento = documento;
    existingUser.eventId = eventId;
    existingUser.eventbriteId = attendee.id;
    await existingUser.save();
    console.log('✅ Usuario actualizado:', email);
    return { action: 'updated', email, eventId };
  } else {
    console.log('👤 Creando nuevo usuario:', email);
    const hashedPassword = await bcrypt.hash(documento, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      documento,
      role: 'student',
      eventId,
      eventbriteId: attendee.id
    });
    await newUser.save();
    console.log('✅ Usuario creado:', email);
    return { action: 'created', email, eventId };
  }
}

async function fetchAttendeeData(apiUrl: string) {
  try {
    console.log('🔄 Intentando obtener datos de:', apiUrl);
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_PRIVATE_TOKEN}`,
      }
    });

    if (!response.ok) {
      console.error('❌ Error en respuesta de Eventbrite:', response.status);
      throw new Error(`Error en API de Eventbrite: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Datos obtenidos correctamente');
    return data.attendees || [data];
  } catch (error) {
    console.error('❌ Error obteniendo datos de Eventbrite:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log('\n🔔 Webhook recibido');
    console.log('📝 Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
    
    // Verificar el método de la petición
    if (request.method !== 'POST') {
      console.log('❌ Método no permitido:', request.method);
      return NextResponse.json(
        { error: 'Método no permitido' },
        { status: 405 }
      );
    }

    // Obtener el cuerpo de la petición
    const body = await request.json();
    console.log('📦 Payload recibido:', JSON.stringify(body, null, 2));

    // Verificar que el payload tenga la estructura esperada
    if (!body || !body.config || !body.config.action) {
      console.log('❌ Payload inválido:', body);
      return NextResponse.json(
        { error: 'Payload inválido' },
        { status: 400 }
      );
    }

    const action = body.config.action;
    console.log('🎯 Acción recibida:', action);
    console.log('🔍 Tipo de acción:', typeof action);
    console.log('📋 Acciones válidas:', validActions);

    // Verificar que la acción sea válida
    if (!validActions.includes(action)) {
      console.log('❌ Acción no válida:', action);
      return NextResponse.json(
        { error: 'Acción no válida' },
        { status: 400 }
      );
    }

    // Manejar el webhook de prueba
    if (action === 'test') {
      console.log('✅ Webhook de prueba procesado correctamente');
      return NextResponse.json({ 
        message: 'Webhook de prueba procesado correctamente',
        received: body
      });
    }

    // Conectar a la base de datos
    const db = await connectDB();
    console.log('✅ Conexión a la base de datos establecida');

    let attendees: any[] = [];
    let orderDetails: any = null;

    // Procesar según el tipo de acción
    if (action === 'order.placed' || action === 'order.updated') {
      console.log('🛍️ Procesando orden...');
      console.log('📦 Datos de la orden:', JSON.stringify(body, null, 2));
      
      // Extraer el ID de la orden de la URL de la API
      const apiUrl = body.api_url;
      console.log('🔗 URL de la API:', apiUrl);
      
      // Extraer el ID de la orden usando una expresión regular más robusta
      const orderIdMatch = apiUrl.match(/\/orders\/(\d+)/);
      const orderId = orderIdMatch ? orderIdMatch[1] : null;
      console.log('📋 ID de la orden:', orderId);

      if (!orderId) {
        console.log('❌ No se encontró ID de orden en la URL:', apiUrl);
        return NextResponse.json(
          { error: 'ID de orden no encontrado' },
          { status: 400 }
        );
      }

      // Obtener detalles de la orden
      try {
        console.log('🌐 Obteniendo detalles de la orden...');
        const orderResponse = await fetch(
          `https://www.eventbriteapi.com/v3/orders/${orderId}/`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          console.log('❌ Error al obtener detalles de la orden:', errorText);
          return NextResponse.json(
            { error: 'Error al obtener detalles de la orden' },
            { status: 500 }
          );
        }

        orderDetails = await orderResponse.json();
        console.log('📋 Detalles de la orden:', JSON.stringify(orderDetails, null, 2));

        // Obtener asistentes de la orden
        attendees = await getOrderAttendees(orderId);
        console.log('👥 Asistentes encontrados:', attendees.length);
      } catch (error) {
        console.error('❌ Error al obtener detalles de la orden:', error);
        return NextResponse.json(
          { error: 'Error al obtener detalles de la orden' },
          { status: 500 }
        );
      }
    } else if (action === 'attendee.updated') {
      console.log('👤 Procesando actualización de asistente...');
      
      // Extraer IDs del payload
      const apiUrl = body.api_url;
      console.log('🔗 URL de la API:', apiUrl);
      
      // Extraer event_id y attendee_id de la URL
      const eventIdMatch = apiUrl.match(/\/events\/(\d+)/);
      const attendeeIdMatch = apiUrl.match(/\/attendees\/(\d+)/);
      
      const eventId = eventIdMatch ? eventIdMatch[1] : null;
      const attendeeId = attendeeIdMatch ? attendeeIdMatch[1] : null;
      
      console.log('📋 IDs extraídos:', { eventId, attendeeId });

      if (!eventId || !attendeeId) {
        console.log('❌ Faltan IDs requeridos:', { eventId, attendeeId });
        return NextResponse.json(
          { error: 'Faltan IDs requeridos' },
          { status: 400 }
        );
      }

      // Obtener detalles del asistente
      try {
        const attendeeResponse = await fetch(
          `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/${attendeeId}/`,
          {
            headers: {
              'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!attendeeResponse.ok) {
          console.log('❌ Error al obtener detalles del asistente:', await attendeeResponse.text());
          return NextResponse.json(
            { error: 'Error al obtener detalles del asistente' },
            { status: 500 }
          );
        }

        const attendeeData = await attendeeResponse.json();
        console.log('📋 Detalles del asistente:', JSON.stringify(attendeeData, null, 2));
        attendees = [attendeeData];
      } catch (error) {
        console.error('❌ Error al obtener detalles del asistente:', error);
        return NextResponse.json(
          { error: 'Error al obtener detalles del asistente' },
          { status: 500 }
        );
      }
    }

    // Procesar cada asistente
    const results: ProcessResult[] = [];
    for (const attendee of attendees) {
      try {
        const result = await processAttendee(attendee);
        results.push(result);
        console.log('✅ Asistente procesado:', result);
      } catch (error) {
        console.error('❌ Error procesando asistente:', error);
        results.push({
          action: 'error',
          email: attendee.profile?.email || 'unknown',
          eventId: attendee.event_id,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    // Resumir resultados
    const summary = {
      total: results.length,
      created: results.filter(r => r.action === 'created').length,
      updated: results.filter(r => r.action === 'updated').length,
      skipped: results.filter(r => r.action === 'skipped').length,
      errors: results.filter(r => r.action === 'error').length,
      skippedReasons: results
        .filter(r => r.action === 'skipped')
        .reduce((acc: Record<string, number>, r) => {
          acc[r.reason || 'unknown'] = (acc[r.reason || 'unknown'] || 0) + 1;
          return acc;
        }, {})
    };

    console.log('\n📊 Resumen de procesamiento:', JSON.stringify(summary, null, 2));

    return NextResponse.json({
      message: 'Webhook procesado correctamente',
      summary
    });

  } catch (error) {
    console.error('❌ Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para verificar que el webhook está activo
export async function GET() {
  return NextResponse.json({ 
    status: 'active',
    validActions,
    documentoQuestionId: process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
  });
} 