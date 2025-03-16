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
    const data = await request.json();
    
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
      // For orders, we need to get the attendee data separately
      console.log('🎫 Procesando nueva orden');
      const attendeeId = data.api_url.split('/').pop();
      attendeeData = await getAttendeeData(attendeeId);
    } else {
      // For attendee events, the data is included in the webhook
      attendeeData = data;
    }

    if (!attendeeData) {
      throw new Error('No se pudo obtener datos del asistente');
    }

    // Extract attendee information
    const email = attendeeData.profile?.email;
    const name = `${attendeeData.profile?.first_name} ${attendeeData.profile?.last_name}`.trim();
    
    // Find documento in answers
    console.log('🔍 Buscando documento en respuestas');
    let documento = null;
    if (attendeeData.answers && Array.isArray(attendeeData.answers)) {
      const documentoAnswer = attendeeData.answers.find(
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