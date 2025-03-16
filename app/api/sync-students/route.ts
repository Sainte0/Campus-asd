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
    console.log('- EVENTBRITE_EVENT_ID:', process.env.EVENTBRITE_EVENT_ID);
    console.log('- EVENTBRITE_API_KEY:', process.env.EVENTBRITE_API_KEY ? '✅' : '❌');
    console.log('- EVENTBRITE_DOCUMENTO_QUESTION_ID:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID);

    if (!process.env.EVENTBRITE_EVENT_ID || !process.env.EVENTBRITE_API_KEY || !process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID) {
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
        console.log(`🔍 Buscando documento con Question ID: ${process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID}`);
        
        let documento = null;
        if (attendee.answers && Array.isArray(attendee.answers)) {
          console.log('📋 Respuestas disponibles:', attendee.answers);
          const documentoAnswer = attendee.answers.find(
            (answer: any) => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
          );
          if (documentoAnswer) {
            documento = documentoAnswer.answer;
            console.log('✅ Documento encontrado:', documento);
          }
        }

        if (!documento) {
          console.log('⚠️ No se encontró documento para:', attendee.email);
          console.log('❓ Question ID configurado:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID);
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
            console.log('✅ Usuario actualizado:', attendee.email);
            results.updated++;
          } else {
            // Hash the documento to use as password
            const hashedPassword = await bcrypt.hash(documento, 10);
            const newUser = new User({
              name: attendee.name,
              email: attendee.email,
              documento: documento,
              password: hashedPassword,
              role: 'student'
            });
            await newUser.save();
            console.log('✅ Usuario creado:', attendee.email);
            results.created++;
          }
        } catch (error) {
          const userError = error as Error;
          console.error('❌ Error procesando usuario:', userError);
          results.errors++;
          results.details.push(`Error procesando usuario ${attendee.email}: ${userError.message}`);
        }
      } catch (error) {
        const attendeeError = error as Error;
        console.error('❌ Error procesando asistente:', attendeeError);
        results.errors++;
        results.details.push(`Error general procesando asistente ${attendee.email}: ${attendeeError.message}`);
      }
    }

    console.log('\n✅ Sincronización completada:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error desconocido durante la sincronización',
      details: results
    }, { status: 500 });
  }
} 