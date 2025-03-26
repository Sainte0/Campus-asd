import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

async function getEventAttendees(eventId: string) {
  console.log('🔍 Obteniendo asistentes del evento:', eventId);
  
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?expand=profile,answers`;
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
    console.error('❌ Error en getEventAttendees:', error);
    throw error;
  }
}

export async function POST(request: Request) {
  try {
    console.log('\n🔄 Iniciando sincronización manual de Eventbrite');
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Se requiere el ID del evento'
      }, { status: 400 });
    }

    // Connect to MongoDB
    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión establecida');

    // Get current students in database
    const currentStudents = await User.find({ eventId });
    console.log(`📊 Estudiantes actuales en la base de datos para el evento ${eventId}:`, currentStudents.length);

    // Get all attendees from Eventbrite
    const attendees = await getEventAttendees(eventId);
    console.log(`📊 Total de asistentes en Eventbrite para el evento ${eventId}:`, attendees.length);

    // Process each attendee
    const results = {
      total: attendees.length,
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    for (const attendee of attendees) {
      try {
        const email = attendee.profile?.email;
        const name = `${attendee.profile?.first_name} ${attendee.profile?.last_name}`.trim();
        
        // Skip Info Requested attendees
        if (name === 'Info Requested Info Requested' || email === 'Info Requested') {
          results.details.push({
            email,
            status: 'skipped',
            reason: 'info_requested'
          });
          results.skipped++;
          continue;
        }

        // Find documento in answers
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
          results.details.push({
            email,
            status: 'skipped',
            reason: 'no_documento'
          });
          results.skipped++;
          continue;
        }

        // Create or update user
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          existingUser.name = name;
          existingUser.documento = documento;
          existingUser.eventId = eventId;
          existingUser.eventbriteId = attendee.id;
          await existingUser.save();
          results.details.push({
            email,
            status: 'updated'
          });
        } else {
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
          results.details.push({
            email,
            status: 'created'
          });
        }
        results.processed++;
      } catch (error) {
        console.error('❌ Error procesando asistente:', error);
        results.details.push({
          email: attendee.profile?.email || 'unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        results.errors++;
      }
    }

    // Get final count of students in database
    const finalStudents = await User.find({ eventId });
    console.log(`📊 Estudiantes finales en la base de datos para el evento ${eventId}:`, finalStudents.length);

    return NextResponse.json({
      status: 'success',
      results,
      databaseCount: finalStudents.length
    });

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return NextResponse.json({ 
      status: 'error',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
} 