import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getEventbriteAttendees, EventbriteAttendee } from '@/lib/eventbrite';
import { createStudent, updateStudent } from '@/lib/students';

interface Student {
  _id: any;
  email: string;
  createdAt?: Date;
  documento?: string;
  eventId?: string;
  commission?: string;
}

interface MissingStudent {
  email: string;
  name: string;
  dni: string | undefined;
}

interface EventStats {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  missing: MissingStudent[];
}

export async function POST() {
  try {
    // Verificar variables de entorno
    if (!process.env.EVENTBRITE_API_KEY) {
      throw new Error('EVENTBRITE_API_KEY no está configurada');
    }

    if (!process.env.EVENTBRITE_EVENT_ID_1 || !process.env.EVENTBRITE_EVENT_ID_2) {
      throw new Error('EVENTBRITE_EVENT_ID_1 o EVENTBRITE_EVENT_ID_2 no están configurados');
    }

    // IDs de las preguntas DNI para cada evento
    const DNI_QUESTION_IDS = {
      [process.env.EVENTBRITE_EVENT_ID_1]: '287305383',
      [process.env.EVENTBRITE_EVENT_ID_2]: '287346273'
    };

    // Conectar a la base de datos
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const studentCommissionsCollection = db.collection('studentCommissions');

    // Obtener todos los asistentes de ambos eventos
    const attendees = await getEventbriteAttendees();

    // Agrupar asistentes por evento
    const attendeesByEvent = attendees.reduce((acc, attendee) => {
      acc[attendee.event_id] = acc[attendee.event_id] || [];
      acc[attendee.event_id].push(attendee);
      return acc;
    }, {} as Record<string, EventbriteAttendee[]>);

    // Mostrar resumen de asistentes por evento
    console.log('\n=== Resumen de Asistentes por Evento ===');
    console.log(`Evento 1 (${process.env.EVENTBRITE_EVENT_ID_1}): ${attendeesByEvent[process.env.EVENTBRITE_EVENT_ID_1]?.length || 0} asistentes`);
    console.log(`Evento 2 (${process.env.EVENTBRITE_EVENT_ID_2}): ${attendeesByEvent[process.env.EVENTBRITE_EVENT_ID_2]?.length || 0} asistentes`);
    console.log('=====================================\n');

    // Obtener estudiantes existentes en la base de datos
    const existingStudents = await usersCollection.find({}, { projection: { email: 1, documento: 1, eventId: 1 } }).toArray();
    
    // Mostrar resumen de estudiantes en la base de datos
    const studentsByEvent = existingStudents.reduce((acc, student) => {
      acc[student.eventId] = acc[student.eventId] || [];
      acc[student.eventId].push(student);
      return acc;
    }, {} as Record<string, any[]>);

    console.log('\n=== Estudiantes en Base de Datos ===');
    console.log(`Evento 1 (${process.env.EVENTBRITE_EVENT_ID_1}): ${studentsByEvent[process.env.EVENTBRITE_EVENT_ID_1]?.length || 0} estudiantes`);
    console.log(`Evento 2 (${process.env.EVENTBRITE_EVENT_ID_2}): ${studentsByEvent[process.env.EVENTBRITE_EVENT_ID_2]?.length || 0} estudiantes`);
    console.log('=====================================\n');

    const results = {
      totalStudents: attendees.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      pending: [] as string[],
      byEvent: {
        [process.env.EVENTBRITE_EVENT_ID_1]: { created: 0, updated: 0, skipped: 0, errors: 0, missing: [] as MissingStudent[] },
        [process.env.EVENTBRITE_EVENT_ID_2]: { created: 0, updated: 0, skipped: 0, errors: 0, missing: [] as MissingStudent[] }
      } as Record<string, EventStats>
    };

    // Crear mapa de estudiantes existentes para búsqueda rápida
    const existingStudentsMap = new Map(existingStudents.map(student => [student.email, student]));

    // Procesar todos los asistentes
    for (const attendee of attendees) {
      try {
        console.log('\n=== Procesando Asistente ===');
        console.log('Email:', attendee.profile.email);
        console.log('Evento:', attendee.event_id);
        console.log('Nombre:', attendee.profile.name);

        // Obtener el DNI del asistente usando el ID de pregunta correspondiente al evento
        const dniAnswer = attendee.answers.find(
          (answer) => answer.question_id === DNI_QUESTION_IDS[attendee.event_id]
        );

        if (!dniAnswer) {
          console.error(`❌ No se encontró respuesta DNI para el asistente ${attendee.profile.email} en el evento ${attendee.event_id}`);
          results.errors++;
          results.byEvent[attendee.event_id].errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        // Usar answer o text, dependiendo de cuál esté disponible
        const dni = (dniAnswer.answer || dniAnswer.text || '').trim();

        if (!dni) {
          console.error(`❌ DNI vacío para el asistente ${attendee.profile.email}`);
          results.errors++;
          results.byEvent[attendee.event_id].errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        console.log('DNI encontrado:', dni);

        // Obtener la comisión del asistente
        const commission = attendee.ticket_class_name;
        console.log('Comisión:', commission);

        const existingStudent = existingStudentsMap.get(attendee.profile.email);

        if (existingStudent) {
          console.log('Estudiante existente encontrado:', {
            email: existingStudent.email,
            documento: existingStudent.documento,
            eventId: existingStudent.eventId,
            commission: existingStudent.commission
          });

          // Verificar si necesitamos actualizar
          const needsUpdate = 
            existingStudent.documento !== dni || 
            existingStudent.eventId !== attendee.event_id ||
            existingStudent.commission !== commission;

          if (needsUpdate) {
            console.log('🔄 Actualizando estudiante existente:', existingStudent.email);
            const updateResult = await updateStudent(existingStudent._id, {
              dni,
              name: attendee.profile.name,
              email: attendee.profile.email,
              eventId: attendee.event_id,
              commission
            });
            console.log('Resultado de actualización:', updateResult);
            results.updated++;
            results.byEvent[attendee.event_id].updated++;
          } else {
            console.log('✅ Estudiante sin cambios:', existingStudent.email);
            results.skipped++;
            results.byEvent[attendee.event_id].skipped++;
          }
        } else {
          console.log('📝 Creando nuevo estudiante...');
          // Crear nuevo estudiante
          const student = await createStudent({
            dni,
            name: attendee.profile.name,
            email: attendee.profile.email,
            role: 'student',
            eventId: attendee.event_id,
            commission
          }) as Student;

          if (!student) {
            console.error(`❌ Error al crear estudiante ${attendee.profile.email}`);
            results.errors++;
            results.byEvent[attendee.event_id].errors++;
            results.pending.push(attendee.profile.email);
            continue;
          }

          console.log('✅ Estudiante creado exitosamente:', {
            id: student._id,
            email: student.email,
            documento: student.documento,
            eventId: student.eventId,
            commission: student.commission
          });

          // Crear comisión para el estudiante
          const commissionResult = await studentCommissionsCollection.insertOne({
            studentId: student._id,
            commissionId: process.env.DEFAULT_COMMISSION_ID,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log('✅ Comisión creada:', commissionResult);

          results.created++;
          results.byEvent[attendee.event_id].created++;
        }
        console.log('=== Fin de Procesamiento ===\n');
      } catch (error: any) {
        console.error(`❌ Error procesando estudiante ${attendee.profile.email}:`, error);
        results.errors++;
        results.byEvent[attendee.event_id].errors++;
        results.pending.push(attendee.profile.email);
      }
    }

    // Verificar estudiantes que faltan
    console.log('\n=== Verificando Estudiantes Faltantes ===');
    for (const [eventId, eventAttendees] of Object.entries(attendeesByEvent)) {
      const eventStudents = studentsByEvent[eventId] || [];
      const eventEmails = new Set(eventStudents.map(s => s.email));
      
      console.log(`\nEvento ${eventId}:`);
      console.log(`Total asistentes: ${eventAttendees.length}`);
      console.log(`Total en BD: ${eventStudents.length}`);
      
      for (const attendee of eventAttendees) {
        if (!eventEmails.has(attendee.profile.email)) {
          const dni = attendee.answers.find(a => a.question_id === DNI_QUESTION_IDS[eventId])?.answer;
          console.log(`❌ Falta en BD: ${attendee.profile.name} (${attendee.profile.email}) - DNI: ${dni}`);
          results.byEvent[eventId].missing.push({
            email: attendee.profile.email,
            name: attendee.profile.name,
            dni
          });
        }
      }
    }
    console.log('=== Fin de Verificación ===\n');

    // Mostrar resumen final por evento
    console.log('\n=== Resumen Final por Evento ===');
    Object.entries(results.byEvent).forEach(([eventId, stats]) => {
      console.log(`\nEvento ${eventId}:`);
      console.log(`- Creados: ${stats.created}`);
      console.log(`- Actualizados: ${stats.updated}`);
      console.log(`- Sin cambios: ${stats.skipped}`);
      console.log(`- Errores: ${stats.errors}`);
      if (stats.missing.length > 0) {
        console.log('\nEstudiantes que faltan:');
        stats.missing.forEach(student => {
          console.log(`- ${student.name} (${student.email}) - DNI: ${student.dni}`);
        });
      }
    });
    console.log('\n=====================================\n');

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error: any) {
    console.error('Error en la sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Error en la sincronización',
        details: error.stack
      },
      { status: 500 }
    );
  }
} 