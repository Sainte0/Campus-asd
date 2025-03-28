import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

async function getEventAttendees(eventId: string, page: number = 1, pageSize: number = 50) {
  console.log(`🔍 Obteniendo asistentes del evento: ${eventId}, página: ${page}`);
  
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?expand=profile,answers&page_size=${pageSize}&page=${page}`;
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

    return {
      attendees: data.attendees,
      pagination: data.pagination
    };
  } catch (error) {
    console.error('❌ Error en getEventAttendees:', error);
    throw error;
  }
}

async function processAttendeesBatch(attendees: any[], eventId: string) {
  const results = {
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

      // Find documento and commission in answers
      let documento = null;
      let commission = null;
      if (attendee.answers && Array.isArray(attendee.answers)) {
        for (const answer of attendee.answers) {
          if (answer.question_id === process.env.EVENTBRITE_DOCUMENTO_QUESTION_ID) {
            documento = answer.answer;
          } else if (answer.question_id === process.env.EVENTBRITE_COMMISSION_QUESTION_ID) {
            commission = answer.answer;
          }
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
        existingUser.commission = commission;
        await existingUser.save();
        results.details.push({
          email,
          status: 'updated',
          commission: commission || 'no_commission'
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
          eventbriteId: attendee.id,
          commission: commission
        });
        await newUser.save();
        results.details.push({
          email,
          status: 'created',
          commission: commission || 'no_commission'
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

  return results;
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

    // Process attendees in batches
    let page = 1;
    let hasMore = true;
    const batchResults = {
      total: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    while (hasMore) {
      console.log(`\n📄 Procesando página ${page}...`);
      
      // Get attendees for current page
      const { attendees, pagination } = await getEventAttendees(eventId, page);
      batchResults.total += attendees.length;

      // Process current batch
      const results = await processAttendeesBatch(attendees, eventId);
      
      // Update batch results
      batchResults.processed += results.processed;
      batchResults.skipped += results.skipped;
      batchResults.errors += results.errors;
      batchResults.details.push(...results.details);

      // Check if there are more pages
      hasMore = pagination.has_more;
      page++;

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get final count of students in database
    const finalStudents = await User.find({ eventId });
    console.log(`📊 Estudiantes finales en la base de datos para el evento ${eventId}:`, finalStudents.length);

    return NextResponse.json({
      status: 'success',
      results: batchResults,
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