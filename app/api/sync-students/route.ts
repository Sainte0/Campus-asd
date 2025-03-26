import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { getEventbriteAttendees, EventbriteAttendee } from '@/lib/eventbrite';
import { createStudent, updateStudent } from '@/lib/students';

export async function POST() {
  try {
    // Verificar variables de entorno
    if (!process.env.EVENTBRITE_API_KEY) {
      throw new Error('EVENTBRITE_API_KEY no está configurada');
    }

    if (!process.env.EVENTBRITE_EVENT_ID_1 || !process.env.EVENTBRITE_EVENT_ID_2) {
      throw new Error('EVENTBRITE_EVENT_ID_1 o EVENTBRITE_EVENT_ID_2 no están configurados');
    }

    if (!process.env.EVENTBRITE_DNI_QUESTION_ID) {
      throw new Error('EVENTBRITE_DNI_QUESTION_ID no está configurado');
    }

    // Conectar a la base de datos
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const studentCommissionsCollection = db.collection('studentCommissions');

    // Obtener todos los asistentes de ambos eventos
    const attendees = await getEventbriteAttendees();

    const results = {
      totalStudents: attendees.length,
      created: 0,
      updated: 0,
      errors: 0,
      pending: [] as string[]
    };

    // Procesar todos los asistentes
    for (const attendee of attendees) {
      try {
        // Obtener el DNI del asistente
        const dniAnswer = attendee.answers.find(
          (answer) => answer.question_id === process.env.EVENTBRITE_DNI_QUESTION_ID
        );

        if (!dniAnswer) {
          console.error(`No se encontró DNI para el asistente ${attendee.profile.email}`);
          results.errors++;
          results.pending.push(attendee.profile.email);
          continue;
        }

        const dni = dniAnswer.answer;

        // Verificar si el estudiante ya existe
        const existingUser = await usersCollection.findOne({ email: attendee.profile.email });

        if (existingUser) {
          // Actualizar estudiante existente
          await updateStudent(existingUser._id, {
            dni,
            name: attendee.profile.name,
            email: attendee.profile.email,
            eventId: attendee.event_id
          });
          results.updated++;
        } else {
          // Crear nuevo estudiante
          const student = await createStudent({
            dni,
            name: attendee.profile.name,
            email: attendee.profile.email,
            role: 'student',
            eventId: attendee.event_id
          });

          // Crear comisión para el estudiante
          await studentCommissionsCollection.insertOne({
            studentId: student._id,
            commissionId: process.env.DEFAULT_COMMISSION_ID,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });

          results.created++;
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