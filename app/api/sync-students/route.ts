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
}

export async function POST(req: Request) {
  const results: SyncResults = {
    created: 0,
    updated: 0,
    errors: 0,
    details: []
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

    // Process each attendee
    for (const attendee of attendees) {
      try {
        console.log(`\n🔄 Procesando asistente: ${attendee.email}`);
        console.log('📝 Datos completos del asistente:', {
          id: attendee.id,
          name: attendee.name,
          email: attendee.email,
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
          continue;
        }

        // Create or update user
        try {
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
        } catch (userError: any) {
          console.error('❌ Error procesando usuario:', userError);
          results.errors++;
          results.details.push(`Error procesando usuario ${attendee.email}: ${userError?.message || 'Error desconocido'}`);
        }
      } catch (attendeeError: any) {
        console.error('❌ Error procesando asistente:', attendeeError);
        results.errors++;
        results.details.push(`Error procesando asistente ${attendee.email}: ${attendeeError?.message || 'Error desconocido'}`);
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