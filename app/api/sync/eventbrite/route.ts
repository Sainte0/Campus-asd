import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';

// Interfaces para las respuestas de Eventbrite
interface EventbriteAnswer {
  question_id: string;
  question: string;
  answer: string;
  type: string;
}

interface EventbriteProfile {
  email: string;
  first_name: string;
  last_name: string;
}

interface EventbriteTicket {
  name: string;
  description: string;
}

interface EventbriteAttendee {
  id: string;
  profile: EventbriteProfile;
  answers: EventbriteAnswer[];
  ticket_class: EventbriteTicket;
}

// IDs de las preguntas para cada evento
const DNI_QUESTION_IDS: Record<string, string> = {
  [process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 || '']: process.env.EVENTBRITE_DNI_QUESTION_ID || '',
  [process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2 || '']: process.env.EVENTBRITE_DNI_QUESTION_ID_2 || ''
};

// IDs de las preguntas de comisión para cada evento
const COMMISSION_QUESTION_IDS: Record<string, string> = {
  [process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 || '']: process.env.EVENTBRITE_COMMISSION_QUESTION_ID || '',
  [process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2 || '']: process.env.EVENTBRITE_COMMISSION_QUESTION_ID_2 || ''
};

async function getEventAttendees(eventId: string, page: number = 1, pageSize: number = 50) {
  const url = `https://www.eventbriteapi.com/v3/events/${eventId}/attendees/?expand=profile,answers,ticket_class&page_size=${pageSize}&page=${page}`;
  
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
    console.log(`📊 Información de paginación:`, {
      has_more: data.pagination.has_more,
      page_count: data.pagination.page_count,
      object_count: data.pagination.object_count
    });
    
    return {
      attendees: data.attendees || [],
      pagination: {
        ...data.pagination,
        has_more: page < data.pagination.page_count
      }
    };
  } catch (error) {
    console.error('❌ Error en getEventAttendees:', error);
    throw error;
  }
}

async function processAttendeesBatch(attendees: EventbriteAttendee[], eventId: string) {
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

        // Obtener la comisión del nombre del ticket
        if (attendee.ticket_class?.name) {
          commission = attendee.ticket_class.name;
          console.log(`🎫 Ticket seleccionado para ${email}: ${commission}`);
        }

        if (attendee.answers && Array.isArray(attendee.answers)) {
          console.log(`\n🔍 Procesando respuestas para ${email}:`);
          console.log('📋 Todas las preguntas disponibles:', attendee.answers.map((a: EventbriteAnswer) => ({
            question_id: a.question_id,
            question: a.question,
            answer: a.answer,
            type: a.type
          })));
          
          for (const answer of attendee.answers) {
            console.log(`\n📝 Analizando respuesta:`, {
              question_id: answer.question_id,
              question: answer.question,
              answer: answer.answer,
              expected_dni_id: DNI_QUESTION_IDS[eventId]
            });
            
            if (answer.question_id === DNI_QUESTION_IDS[eventId]) {
              documento = answer.answer;
              console.log(`✅ DNI encontrado para ${email}: ${documento}`);
            }
          }
        }

        if (!documento) {
          console.log(`⚠️ No se encontró documento para ${email}`);
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
    console.log('🔑 IDs de preguntas configurados:', {
      dni: DNI_QUESTION_IDS,
      commission: COMMISSION_QUESTION_IDS
    });
    
    const { eventId } = await request.json();
    
    if (!eventId) {
      return NextResponse.json({ 
        status: 'error',
        message: 'Se requiere el ID del evento'
      }, { status: 400 });
    }

    if (!DNI_QUESTION_IDS[eventId]) {
      return NextResponse.json({ 
        status: 'error',
        message: 'ID de evento no válido o no configurado'
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
      
      try {
        const { attendees, pagination } = await getEventAttendees(eventId, page);
        
        if (attendees.length === 0) {
          console.log('❌ No se encontraron asistentes en esta página');
          break;
        }

        batchResults.total += attendees.length;
        const results = await processAttendeesBatch(attendees, eventId);
        
        batchResults.processed += results.processed;
        batchResults.skipped += results.skipped;
        batchResults.errors += results.errors;
        batchResults.details.push(...results.details);

        hasMore = pagination.has_more;
        console.log(`📊 Estado de paginación:`, {
          has_more: pagination.has_more,
          page_count: pagination.page_count,
          current_page: page,
          total_processed: batchResults.total
        });

        page++;

        // Pequeña pausa entre páginas para evitar rate limiting
        if (hasMore) {
          console.log('⏳ Esperando 1 segundo antes de la siguiente página...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Error procesando página ${page}:`, error);
        // Intentar la siguiente página en caso de error
        page++;
        continue;
      }
    }

    const finalStudents = await User.find({ eventId });
    console.log(`\n✅ Sincronización completada. Total de estudiantes: ${finalStudents.length}`);
    console.log(`📊 Resumen final:`, {
      total_procesados: batchResults.total,
      creados_actualizados: batchResults.processed,
      omitidos: batchResults.skipped,
      errores: batchResults.errors,
      total_en_bd: finalStudents.length
    });
    
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