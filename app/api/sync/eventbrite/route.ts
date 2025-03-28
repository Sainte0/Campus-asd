import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

async function getEventAttendees(eventId: string, page: number = 1, pageSize: number = 50) {
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?expand=profile,answers&page_size=${pageSize}&page=${page}`;
  
  try {
    console.log(`🔍 Obteniendo página ${page} de asistentes...`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error en getEventAttendees: ${response.status} - ${errorText}`);
      throw new Error(`Error obteniendo asistentes: ${response.status}`);
    }

    const data = await response.json();
    console.log(`✅ Página ${page}: ${data.attendees?.length || 0} asistentes encontrados`);
    return {
      attendees: data.attendees || [],
      pagination: data.pagination
    };
  } catch (error) {
    console.error('❌ Error en getEventAttendees:', error);
    return {
      attendees: [],
      pagination: { has_more: false }
    };
  }
}

async function processAttendeesBatch(attendees: any[], eventId: string) {
  const results = {
    processed: 0,
    skipped: 0,
    errors: 0,
    details: [] as any[]
  };

  // Procesar en paralelo con un límite de concurrencia
  const batchSize = 10;
  for (let i = 0; i < attendees.length; i += batchSize) {
    const batch = attendees.slice(i, i + batchSize);
    const promises = batch.map(async (attendee) => {
      try {
        const email = attendee.profile?.email;
        const name = `${attendee.profile?.first_name} ${attendee.profile?.last_name}`.trim();
        
        if (name === 'Info Requested Info Requested' || email === 'Info Requested') {
          results.details.push({
            email,
            status: 'skipped',
            reason: 'info_requested'
          });
          results.skipped++;
          return;
        }

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
          return;
        }

        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
          await User.updateOne(
            { email },
            {
              $set: {
                name,
                documento,
                eventId,
                eventbriteId: attendee.id,
                commission
              }
            }
          );
          results.details.push({
            email,
            status: 'updated',
            commission: commission || 'no_commission'
          });
        } else {
          const hashedPassword = await bcrypt.hash(documento, 10);
          await User.create({
            name,
            email,
            password: hashedPassword,
            documento,
            role: 'student',
            eventId,
            eventbriteId: attendee.id,
            commission
          });
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
    });

    await Promise.all(promises);
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

    console.log('🔄 Conectando a MongoDB...');
    await connectDB();
    console.log('✅ Conexión establecida');

    const currentStudents = await User.find({ eventId });
    console.log(`📊 Estudiantes actuales en la base de datos: ${currentStudents.length}`);

    let page = 1;
    let hasMore = true;
    const batchResults = {
      total: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };

    // Procesar todas las páginas
    while (hasMore) {
      console.log(`\n📄 Procesando página ${page}...`);
      
      const { attendees, pagination } = await getEventAttendees(eventId, page);
      if (attendees.length === 0) break;

      batchResults.total += attendees.length;
      const results = await processAttendeesBatch(attendees, eventId);
      
      batchResults.processed += results.processed;
      batchResults.skipped += results.skipped;
      batchResults.errors += results.errors;
      batchResults.details.push(...results.details);

      hasMore = pagination.has_more;
      page++;

      // Pequeña pausa entre páginas para evitar rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const finalStudents = await User.find({ eventId });
    console.log(`\n✅ Sincronización completada. Total de estudiantes: ${finalStudents.length}`);
    
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