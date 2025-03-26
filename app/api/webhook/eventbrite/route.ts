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
}

interface ProcessResult {
  action: 'created' | 'updated' | 'skipped' | 'error';
  email: string;
  eventId: string;
  reason?: 'info_requested' | 'no_documento';
  error?: string;
}

// Solo mantenemos las acciones que realmente necesitamos
const validActions = [
  'order.placed',  // Cuando alguien paga
  'order.updated', // Si hay cambios en la orden
  'attendee.updated' // Si hay cambios en los datos del asistente
];

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

  // Find documento in answers
  console.log('🔍 Buscando documento en respuestas');
  let documento = null;
  
  if (attendee.answers && Array.isArray(attendee.answers)) {
    console.log('📝 Respuestas disponibles:', JSON.stringify(attendee.answers, null, 2));
    const documentoAnswer = attendee.answers.find(
      (answer: any) => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
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

export async function POST(request: Request) {
  try {
    console.log('\n📥 Webhook recibido de Eventbrite');
    const data = await request.json() as EventbriteWebhookPayload;
    
    // Get action from config
    const action = data.config.action;
    console.log('📋 Acción recibida:', action);
    console.log('📝 Datos completos:', JSON.stringify(data, null, 2));

    if (!validActions.includes(action)) {
      console.log('⏭️ Acción ignorada:', action);
      return NextResponse.json({ status: 'ignored', action });
    }

    // Connect to MongoDB
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión establecida');

    const results = {
      status: 'success',
      action,
      processed: [] as ProcessResult[],
      eventId: null as string | null,
      summary: {
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
        skippedReasons: {} as Record<string, number>
      }
    };

    if (action === 'order.placed' || action === 'order.updated') {
      // Extract order ID from URL
      const orderId = data.api_url.split('/orders/')[1]?.replace('/', '');
      console.log('🔍 URL de la orden:', data.api_url);
      console.log('🔑 Order ID extraído:', orderId);
      
      if (!orderId) {
        throw new Error('No se pudo obtener el ID de la orden');
      }

      console.log('🎫 Procesando orden:', orderId);

      // Get and process all attendees in the order
      const attendees = await getOrderAttendees(orderId);
      console.log(`📋 Procesando ${attendees.length} asistentes`);

      // Log event distribution
      const eventDistribution = attendees.reduce((acc: any, attendee: any) => {
        const eventId = attendee.event_id;
        acc[eventId] = (acc[eventId] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Distribución de asistentes por evento:', eventDistribution);

      results.summary.total = attendees.length;

      for (const attendee of attendees) {
        try {
          const result = await processAttendee(attendee);
          results.processed.push(result);
          results.eventId = attendee.event_id;

          // Update summary
          if (result.action === 'created') results.summary.created++;
          else if (result.action === 'updated') results.summary.updated++;
          else if (result.action === 'skipped' && result.reason) {
            results.summary.skipped++;
            results.summary.skippedReasons[result.reason] = (results.summary.skippedReasons[result.reason] || 0) + 1;
          }
        } catch (error) {
          console.error('❌ Error procesando asistente:', error);
          results.processed.push({ 
            action: 'error', 
            email: attendee.profile?.email || 'unknown',
            eventId: attendee.event_id || 'unknown',
            error: error instanceof Error ? error.message : 'Error desconocido'
          });
          results.summary.errors++;
        }
      }
    } else if (action === 'attendee.updated') {
      // For attendee updates, we need to get the attendee data
      // Extract attendee ID from URL - Format: https://www.eventbriteapi.com/v3/events/1287687180019/attendees/19674182663/
      const attendeeId = data.api_url.split('/attendees/')[1]?.replace('/', '');
      console.log('🔍 URL del asistente:', data.api_url);
      console.log('🔑 Attendee ID extraído:', attendeeId);

      if (!attendeeId) {
        throw new Error('No se pudo obtener el ID del asistente');
      }

      console.log('👤 Procesando actualización de asistente:', attendeeId);

      // Get attendee data
      const url = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/attendees/${attendeeId}/?expand=profile,answers`;
      console.log('🌐 URL de la petición:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error obteniendo datos del asistente. Status:', response.status);
        console.error('📝 Error detallado:', errorText);
        throw new Error(`Error obteniendo datos del asistente: ${response.status} - ${errorText}`);
      }

      const attendeeData = await response.json();
      console.log('✅ Datos del asistente recibidos:', {
        email: attendeeData.profile?.email,
        name: `${attendeeData.profile?.first_name} ${attendeeData.profile?.last_name}`.trim()
      });

      try {
        const result = await processAttendee(attendeeData);
        results.processed.push(result);
      } catch (error) {
        console.error('❌ Error procesando asistente:', error);
        results.processed.push({ 
          action: 'error',
          email: attendeeData.profile?.email || 'unknown',
          eventId: attendeeData.event_id || 'unknown',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        results.summary.errors++;
      }
    }

    console.log('✅ Procesamiento completado:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
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