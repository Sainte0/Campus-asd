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
    console.log('- EVENTBRITE_EVENT_ID:', process.env.EVENTBRITE_EVENT_ID ? '✅' : '❌');
    console.log('- EVENTBRITE_API_KEY:', process.env.EVENTBRITE_API_KEY ? '✅' : '❌');
    console.log('- EVENTBRITE_DOCUMENTO_QUESTION_ID:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID ? '✅' : '❌');

    if (!process.env.EVENTBRITE_EVENT_ID || !process.env.EVENTBRITE_API_KEY || !process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID) {
      throw new Error('Missing required environment variables');
    }

    // Connect to MongoDB
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión a MongoDB establecida');

    // Get attendees from Eventbrite
    console.log('🔍 Obteniendo asistentes de Eventbrite...');
    const attendees = await getEventbriteAttendees();
    console.log(`✅ ${attendees.length} asistentes procesados`);

    // Process each attendee
    for (const attendee of attendees) {
      console.log(`🔄 Procesando asistente: ${attendee.email}`);
      console.log('📝 Datos completos del asistente:', {
        id: attendee.id,
        name: attendee.name,
        email: attendee.email
      });

      // Find documento in answers
      console.log(`🔍 Buscando documento con Question ID: ${process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID}`);
      
      let documento = null;
      if (attendee.answers && Array.isArray(attendee.answers)) {
        const documentoAnswer = attendee.answers.find(
          (answer: any) => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
        );
        if (documentoAnswer) {
          documento = documentoAnswer.answer;
        }
      }

      if (!documento) {
        console.log('⚠️ No se encontró documento para:', attendee.email);
        console.log('❓ Question ID configurado:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID);
        console.log('📋 Todas las respuestas disponibles:', JSON.stringify(attendee.answers, null, 2));
        results.errors++;
        results.details.push(`No se encontró documento para: ${attendee.email} - IDs disponibles: ${attendee.answers?.map((a: any) => a.question_id).join(', ')}`);
        continue;
      }

      // Create or update user
      const existingUser = await User.findOne({ email: attendee.email });
      
      if (existingUser) {
        existingUser.name = attendee.name;
        existingUser.documento = documento;
        await existingUser.save();
        console.log('✅ Usuario actualizado:', attendee.email);
        results.updated++;
      } else {
        const newUser = new User({
          name: attendee.name,
          email: attendee.email,
          documento: documento,
          role: 'student'
        });
        await newUser.save();
        console.log('✅ Usuario creado:', attendee.email);
        results.created++;
      }
    }

    console.log('✅ Sincronización completada:', results);
    return NextResponse.json(results);

  } catch (error) {
    console.error('❌ Error durante la sincronización:', error);
    return NextResponse.json({ error: 'Error during synchronization' }, { status: 500 });
  }
} 