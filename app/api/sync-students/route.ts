import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getEventbriteAttendees, EventbriteAttendee } from '@/lib/eventbrite';
import { createStudent } from '@/lib/students';

interface Student {
  _id: any;
  email: string;
  createdAt?: Date;
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

    const results = {
      totalStudents: attendees.length,
      created: 0,
      skipped: 0,
      errors: 0,
      pending: [] as string[]
    };

    // Obtener todos los emails existentes de una vez
    const existingEmails = new Set(
      (await usersCollection.find({}, { projection: { email: 1 } }).toArray())
        .map(user => user.email)
    );

    // Procesar solo los asistentes nuevos
    for (const attendee of attendees) {
      try {
        // Si el email ya existe, lo saltamos
        if (existingEmails.has(attendee.profile.email)) {
          results.skipped++;
          continue;
        }

        console.log('Procesando asistente:', {
          email: attendee.profile.email,
          eventId: attendee.event_id
        });

        // Obtener el DNI del asistente usando el ID de pregunta correspondiente al evento
        const dniAnswer = attendee.answers.find(
          (answer) => answer.question_id === DNI_QUESTION_IDS[attendee.event_id]
        );

        if (!dniAnswer) {
          console.error(`No se encontró respuesta DNI para el asistente ${attendee.profile.email} en el evento ${attendee.event_id}`);
          results.errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        // Usar answer o text, dependiendo de cuál esté disponible
        const dni = (dniAnswer.answer || dniAnswer.text || '').trim();

        if (!dni) {
          console.error(`DNI vacío para el asistente ${attendee.profile.email}`);
          results.errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        console.log('DNI encontrado:', dni);

        // Crear o actualizar estudiante
        const student = await createStudent({
          dni,
          name: attendee.profile.name,
          email: attendee.profile.email,
          role: 'student',
          eventId: attendee.event_id
        }) as Student;

        if (!student) {
          console.error(`Error al crear/actualizar estudiante ${attendee.profile.email}`);
          results.errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        // Si el estudiante fue creado (no existía antes)
        if (student._id && !student.createdAt) {
          console.log('Estudiante creado:', student);

          // Crear comisión para el estudiante
          await studentCommissionsCollection.insertOne({
            studentId: student._id,
            commissionId: process.env.DEFAULT_COMMISSION_ID,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          results.created++;
        } else {
          console.log('Estudiante ya existía:', student.email);
          results.skipped++;
        }
      } catch (error: any) {
        console.error(`Error procesando estudiante ${attendee.profile.email}:`, error);
        results.errors++;
        results.pending.push(attendee.profile.email);
      }
    }

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