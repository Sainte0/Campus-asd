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
  pending: string[];
  totalStudents: number;
}

const BATCH_SIZE = 2; // Reducido a 2 estudiantes por lote
const MAX_RETRIES = 3;
const DELAY_BETWEEN_BATCHES = 3000; // Aumentado a 3 segundos

async function processAttendee(attendee: any, results: SyncResults) {
  try {
    console.log(`\n🔄 Procesando asistente: ${attendee.email}`);
    
    // Find documento in answers
    const dniQuestionId = attendee.event_id === process.env.EVENTBRITE_EVENT_ID_1 ? '287305383' : '287346273';
    let documento = null;
    
    if (attendee.answers && Array.isArray(attendee.answers)) {
      const documentoAnswer = attendee.answers.find(
        (answer: any) => answer.question_id === dniQuestionId
      );
      if (documentoAnswer) {
        documento = documentoAnswer.answer;
      }
    }

    if (!documento) {
      console.log('⚠️ No se encontró documento para:', attendee.email);
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
    pending: [],
    totalStudents: 0
  };

  try {
    console.log('🔄 Iniciando sincronización de estudiantes...');
    
    // Verify environment variables
    if (!process.env.EVENTBRITE_EVENT_ID_1 || !process.env.EVENTBRITE_EVENT_ID_2 || !process.env.EVENTBRITE_API_KEY) {
      throw new Error('Faltan variables de entorno requeridas');
    }

    // Connect to MongoDB
    await connectDB();
    console.log('✅ Conexión a MongoDB establecida');

    // Get attendees from Eventbrite
    const attendees = await getEventbriteAttendees();
    results.totalStudents = attendees.length;
    console.log(`✅ ${attendees.length} asistentes encontrados`);

    // Process only the first batch
    const currentBatch = attendees.slice(0, BATCH_SIZE);
    console.log(`\n🔄 Procesando primer lote de ${currentBatch.length} estudiantes...`);
    
    for (const attendee of currentBatch) {
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

    // Add remaining attendees to pending list
    if (attendees.length > BATCH_SIZE) {
      const remainingAttendees = attendees.slice(BATCH_SIZE);
      results.pending.push(...remainingAttendees.map(a => a.email));
      results.details.push(`\n${remainingAttendees.length} estudiantes pendientes para la siguiente sincronización`);
    }

    return NextResponse.json({
      success: true,
      message: 'Sincronización parcial completada',
      results,
      nextBatch: attendees.length > BATCH_SIZE
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