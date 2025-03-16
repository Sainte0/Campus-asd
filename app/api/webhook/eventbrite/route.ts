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

const validActions = [
  'order.placed',
  'attendee.updated',
  'attendee.checked_in',
  'attendee.checked_out'
];

async function getAttendeeData(attendeeId: string) {
  const url = `https://www.eventbriteapi.com/v3/events/${process.env.EVENTBRITE_EVENT_ID}/attendees/${attendeeId}/?expand=profile,answers`;
  console.log('🔍 Obteniendo datos del asistente:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`
    }
  });

  if (!response.ok) {
    throw new Error(`Error obteniendo datos del asistente: ${response.status}`);
  }

  return response.json();
}

export async function POST(request: Request) {
  try {
    console.log('📥 Webhook recibido de Eventbrite');
    const data = await request.json() as EventbriteWebhookPayload;
    
    console.log('📋 Acción recibida:', data.action);
    console.log('📝 Datos completos:', JSON.stringify(data, null, 2));

    if (!validActions.includes(data.action)) {
      console.log('⏭️ Acción ignorada:', data.action);
      return NextResponse.json({ status: 'ignored', action: data.action });
    }

    // Connect to MongoDB
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión establecida');

    let attendeeData;
    
    // Get attendee data based on the webhook type
    if (data.action === 'order.placed') {
      // For orders, we need to get the attendee data from the order
      console.log('🎫 Procesando nueva orden');
      console.log('📝 URL de la API:', data.api_url);
      
      // Get order ID from the URL
      const orderId = data.api_url.split('/').pop();
      console.log('🔑 Order ID:', orderId);
      
      // Get attendees for this order
      const orderUrl = `https://www.eventbriteapi.com/v3/orders/${orderId}/attendees/?expand=profile,answers`;
      console.log('🔍 Obteniendo asistentes de la orden:', orderUrl);
      
      const response = await fetch(orderUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error obteniendo asistentes de la orden:', response.status);
        console.error('📝 Error detallado:', errorText);
        throw new Error(`Error obteniendo asistentes de la orden: ${response.status}`);
      }

      const orderData = await response.json();
      console.log('📦 Datos de la orden:', JSON.stringify(orderData, null, 2));

      if (!orderData.attendees || !orderData.attendees.length) {
        throw new Error('No se encontraron asistentes en la orden');
      }

      // Process each attendee in the order
      for (const attendee of orderData.attendees) {
        console.log('👤 Procesando asistente de la orden:', attendee.profile?.email);
        
        const email = attendee.profile?.email;
        const name = `${attendee.profile?.first_name} ${attendee.profile?.last_name}`.trim();
        
        // Find documento in answers
        console.log('🔍 Buscando documento en respuestas');
        console.log('📝 Respuestas disponibles:', attendee.answers);
        
        let documento = null;
        if (attendee.answers && Array.isArray(attendee.answers)) {
          const documentoAnswer = attendee.answers.find(
            (answer: any) => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
          );
          if (documentoAnswer) {
            documento = documentoAnswer.answer;
            console.log('✅ Documento encontrado:', documento);
          }
        }

        if (!documento) {
          console.error('❌ No se encontró documento para:', email);
          continue;
        }

        // Create or update user
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          console.log('📝 Actualizando usuario existente:', email);
          existingUser.name = name;
          existingUser.documento = documento;
          await existingUser.save();
          console.log('✅ Usuario actualizado:', email);
        } else {
          console.log('👤 Creando nuevo usuario:', email);
          const hashedPassword = await bcrypt.hash(documento, 10);
          const newUser = new User({
            name,
            email,
            password: hashedPassword,
            documento,
            role: 'student'
          });
          await newUser.save();
          console.log('✅ Usuario creado:', email);
        }
      }

      return NextResponse.json({ 
        status: 'success',
        action: 'processed_order',
        orderId
      });

    } else {
      // For attendee events, the data is included in the webhook
      attendeeData = data.attendee;
      
      if (!attendeeData || !attendeeData.profile) {
        throw new Error('Datos del asistente no válidos');
      }

      const email = attendeeData.profile.email;
      const name = `${attendeeData.profile.first_name} ${attendeeData.profile.last_name}`.trim();
      
      // Find documento in answers
      console.log('🔍 Buscando documento en respuestas');
      let documento = null;
      if (attendeeData.profile.answers && Array.isArray(attendeeData.profile.answers)) {
        const documentoAnswer = attendeeData.profile.answers.find(
          (answer: any) => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
        );
        if (documentoAnswer) {
          documento = documentoAnswer.answer;
          console.log('✅ Documento encontrado:', documento);
        }
      }

      if (!documento) {
        throw new Error(`No se encontró documento para el asistente: ${email}`);
      }

      // Create or update user
      const existingUser = await User.findOne({ email });
      
      if (existingUser) {
        console.log('📝 Actualizando usuario existente:', email);
        existingUser.name = name;
        existingUser.documento = documento;
        await existingUser.save();
        console.log('✅ Usuario actualizado');
        
        return NextResponse.json({ 
          status: 'success',
          action: 'updated',
          email 
        });
      } else {
        console.log('👤 Creando nuevo usuario:', email);
        const hashedPassword = await bcrypt.hash(documento, 10);
        const newUser = new User({
          name,
          email,
          password: hashedPassword,
          documento,
          role: 'student'
        });
        await newUser.save();
        console.log('✅ Usuario creado');

        return NextResponse.json({ 
          status: 'success',
          action: 'created',
          email 
        });
      }
    }

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