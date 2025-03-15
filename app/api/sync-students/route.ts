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

export async function POST(request: Request) {
  try {
    console.log('🔄 Iniciando sincronización de estudiantes...');
    console.log('🔑 Verificando variables de entorno:');
    console.log('- EVENTBRITE_EVENT_ID:', process.env.EVENTBRITE_EVENT_ID ? '✅' : '❌');
    console.log('- EVENTBRITE_API_KEY:', process.env.EVENTBRITE_API_KEY ? '✅' : '❌');
    console.log('- EVENTBRITE_DOCUMENTO_QUESTION_ID:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID ? '✅' : '❌');
    
    const session = await getServerSession(options);
    
    if (!session?.user || session.user.role !== 'admin') {
      console.log('❌ Acceso no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (!process.env.EVENTBRITE_EVENT_ID || !process.env.EVENTBRITE_API_KEY || !process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID) {
      console.error('❌ Faltan variables de entorno necesarias');
      return NextResponse.json(
        { 
          error: 'Configuración incompleta',
          details: 'Faltan variables de entorno necesarias. Contacta al administrador.'
        },
        { status: 500 }
      );
    }

    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión a MongoDB establecida');

    console.log('🔍 Obteniendo asistentes de Eventbrite...');
    const attendees = await getEventbriteAttendees();
    console.log(`✅ ${attendees.length} asistentes encontrados`);

    const results: SyncResults = {
      created: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    for (const attendee of attendees) {
      try {
        console.log(`\n🔄 Procesando asistente: ${attendee.profile.email}`);
        console.log('📝 Datos completos del asistente:', JSON.stringify({
          id: attendee.id,
          name: attendee.profile.name,
          email: attendee.profile.email,
          answers: attendee.profile.answers?.map(a => ({
            question_id: a.question_id,
            answer: a.answer
          }))
        }, null, 2));
        
        // Obtener el documento del asistente
        console.log('🔍 Buscando documento con Question ID:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID);
        const documentoAnswer = attendee.profile.answers?.find(
          answer => answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID
        );

        if (!documentoAnswer?.answer) {
          console.log(`⚠️ No se encontró documento para: ${attendee.profile.email}`);
          console.log('❓ Question ID configurado:', process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID);
          console.log('📋 Todas las respuestas disponibles:', JSON.stringify(attendee.profile.answers, null, 2));
          results.errors++;
          results.details.push(`No se encontró documento para: ${attendee.profile.email} - IDs disponibles: ${attendee.profile.answers?.map(a => a.question_id).join(', ')}`);
          continue;
        }

        const documento = documentoAnswer.answer.trim();
        console.log('📄 Documento encontrado:', documento);
        
        // Buscar usuario existente
        console.log('🔍 Buscando usuario existente...');
        const existingUser = await User.findOne({
          $or: [
            { email: attendee.profile.email },
            { eventbriteId: attendee.id },
            { documento: documento }
          ]
        });

        if (existingUser) {
          console.log('📝 Actualizando usuario existente:', attendee.profile.email);
          // Actualizar usuario existente
          await User.findByIdAndUpdate(existingUser._id, {
            name: attendee.profile.name,
            eventbriteId: attendee.id,
            // No actualizamos la contraseña ya que debe ser el documento
          });
          console.log('✅ Usuario actualizado correctamente');
          results.updated++;
          results.details.push(`Usuario actualizado: ${attendee.profile.email}`);
        } else {
          console.log('👤 Creando nuevo usuario:', attendee.profile.email);
          // Crear nuevo usuario
          const hashedPassword = await bcrypt.hash(documento, 10);
          await User.create({
            name: attendee.profile.name,
            email: attendee.profile.email,
            password: hashedPassword,
            role: 'student',
            eventbriteId: attendee.id,
            documento: documento,
            status: 'registered'
          });
          console.log('✅ Usuario creado correctamente');
          results.created++;
          results.details.push(`Usuario creado: ${attendee.profile.email}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        console.error(`❌ Error procesando asistente ${attendee.profile.email}:`, errorMessage);
        console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
        results.errors++;
        results.details.push(`Error con ${attendee.profile.email}: ${errorMessage}`);
      }
    }

    console.log('\n✅ Sincronización completada:', results);
    return NextResponse.json({
      message: 'Sincronización completada',
      results
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('❌ Error en sincronización:', errorMessage);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Error en sincronización',
        details: errorMessage
      },
      { status: 500 }
    );
  }
} 