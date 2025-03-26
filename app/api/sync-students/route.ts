import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { getEventbriteAttendees } from '@/lib/eventbrite';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

interface SyncResults {
  created: number;
  updated: number;
  errors: number;
  details: string[];
  pending: string[]; // Lista de emails pendientes de procesar
}

const BATCH_SIZE = 3; // Reducido a 3 estudiantes por lote
const MAX_RETRIES = 3; // Número máximo de reintentos
const DELAY_BETWEEN_BATCHES = 2000; // 2 segundos entre lotes

async function processAttendee(attendee: any, results: SyncResults) {
  try {
    console.log(`\n🔄 Procesando asistente: ${attendee.email}`);
    console.log('📝 Datos completos del asistente:', {
      id: attendee.id,
      name: attendee.name,
      email: attendee.email,
      event_id: attendee.event_id,
      answers: attendee.answers
    });

    // Find documento in answers
    const dniQuestionId = attendee.event_id === process.env.EVENTBRITE_EVENT_ID_1 ? '287305383' : '287346273';
    console.log(`🔍 Buscando documento con Question ID: ${dniQuestionId}`);
    
    let documento = null;
    if (attendee.answers && Array.isArray(attendee.answers)) {
      console.log('📋 Respuestas disponibles:', attendee.answers);
      const documentoAnswer = attendee.answers.find(
        (answer: any) => answer.question_id === dniQuestionId
      );
      if (documentoAnswer) {
        documento = documentoAnswer.answer;
        console.log('✅ Documento encontrado:', documento);
      }
    }

    if (!documento) {
      console.log('⚠️ No se encontró documento para:', attendee.email);
      console.log('❓ Question ID configurado:', dniQuestionId);
      results.errors++;
      results.details.push(`No se encontró documento para: ${attendee.email}`);
      return false;
    }

    // Create or update user
    const existingUser = await User.findOne({ email: attendee.email });
    
    if (existingUser) {
      existingUser.name = attendee.name;
      existingUser.documento = documento;
      await existingUser.save();
      results.updated++;
      results.details.push(`Usuario actualizado: ${attendee.email}`);
    } else {
      const hashedPassword = await bcrypt.hash(documento, 10);
      await User.create({
        name: attendee.name,
        email: attendee.email,
        documento,
        password: hashedPassword,
        role: 'student'
      });
      results.created++;
      results.details.push(`Usuario creado: ${attendee.email}`);
    }
    return true;
  } catch (error: any) {
    console.error('❌ Error procesando asistente:', error);
    results.errors++;
    results.details.push(`Error procesando asistente ${attendee.email}: ${error?.message || 'Error desconocido'}`);
    return false;
  }
}

export async function POST(req: Request) {
  const results: SyncResults = {
    created: 0,
    updated: 0,
    errors: 0,
    details: [],
    pending: []
  };

  try {
    console.log('🔄 Iniciando sincronización de estudiantes...');
    
    // Verify environment variables
    console.log('🔑 Verificando variables de entorno:');
    console.log('- EVENTBRITE_EVENT_ID_1:', process.env.EVENTBRITE_EVENT_ID_1);
    console.log('- EVENTBRITE_EVENT_ID_2:', process.env.EVENTBRITE_EVENT_ID_2);
    console.log('- EVENTBRITE_API_KEY:', process.env.EVENTBRITE_API_KEY ? '✅' : '❌');

    if (!process.env.EVENTBRITE_EVENT_ID_1 || !process.env.EVENTBRITE_EVENT_ID_2 || !process.env.EVENTBRITE_API_KEY) {
      throw new Error('Faltan variables de entorno requeridas');
    }

    // Connect to MongoDB
    console.log('🔄 Conectando a MongoDB...');
    try {
      await connectDB();
      console.log('✅ Conexión a MongoDB establecida');
    } catch (dbError) {
      console.error('❌ Error conectando a MongoDB:', dbError);
      throw new Error('Error de conexión a la base de datos');
    }

    // Get attendees from Eventbrite
    console.log('🔍 Obteniendo asistentes de Eventbrite...');
    let attendees;
    try {
      attendees = await getEventbriteAttendees();
      console.log(`✅ ${attendees.length} asistentes encontrados:`, 
        attendees.map(a => ({ email: a.email, name: a.name })));
    } catch (eventbriteError) {
      console.error('❌ Error obteniendo asistentes de Eventbrite:', eventbriteError);
      throw new Error('Error obteniendo asistentes de Eventbrite');
    }

    // Process attendees in batches
    for (let i = 0; i < attendees.length; i += BATCH_SIZE) {
      const batch = attendees.slice(i, i + BATCH_SIZE);
      console.log(`\n🔄 Procesando lote ${Math.floor(i/BATCH_SIZE) + 1} de ${Math.ceil(attendees.length/BATCH_SIZE)}`);
      
      // Process each attendee in the batch
      for (const attendee of batch) {
        let success = false;
        let retries = 0;

        while (!success && retries < MAX_RETRIES) {
          success = await processAttendee(attendee, results);
          if (!success) {
            retries++;
            if (retries < MAX_RETRIES) {
              console.log(`🔄 Reintentando asistente ${attendee.email} (intento ${retries + 1}/${MAX_RETRIES})`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!success) {
          results.pending.push(attendee.email);
          results.details.push(`No se pudo procesar el asistente ${attendee.email} después de ${MAX_RETRIES} intentos`);
        }
      }

      // Add a delay between batches
      if (i + BATCH_SIZE < attendees.length) {
        console.log(`⏳ Esperando ${DELAY_BETWEEN_BATCHES/1000} segundos antes del siguiente lote...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización completada',
      results
    });
  } catch (error: any) {
    console.error('❌ Error general:', error);
    return NextResponse.json({
      success: false,
      message: 'Error en la sincronización',
      error: error?.message || 'Error desconocido',
      results
    }, { status: 500 });
  }
} 