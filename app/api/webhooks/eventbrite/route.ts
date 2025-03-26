import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';

const EVENTBRITE_EVENT_ID_1 = process.env.EVENTBRITE_EVENT_ID_1;
const EVENTBRITE_EVENT_ID_2 = process.env.EVENTBRITE_EVENT_ID_2;

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { config, api_url, event } = payload;

    // Verificar que el evento sea uno de los que nos interesa
    if (event.id !== EVENTBRITE_EVENT_ID_1 && event.id !== EVENTBRITE_EVENT_ID_2) {
      return NextResponse.json({ message: 'Evento no relevante' });
    }

    const { db } = await connectToDatabase();

    // Obtener detalles del ticket
    const ticketResponse = await fetch(api_url, {
      headers: {
        'Authorization': `Bearer ${process.env.EVENTBRITE_API_KEY}`
      }
    });
    const ticketData = await ticketResponse.json();

    // Obtener las respuestas del formulario
    const answers = ticketData.answers || [];
    
    // Determinar el ID de la pregunta del DNI según el evento
    const dniQuestionId = event.id === EVENTBRITE_EVENT_ID_1 ? '287305383' : '287346273';
    
    const dniAnswer = answers.find((answer: any) => answer.question_id === dniQuestionId);
    const dni = dniAnswer ? dniAnswer.answer : null;

    if (!dni) {
      return NextResponse.json({ error: 'No se encontró el DNI del estudiante' }, { status: 400 });
    }

    // Verificar si el estudiante ya existe
    const existingStudent = await db.collection('users').findOne({ dni });

    if (existingStudent) {
      // Si el estudiante ya existe, verificar si ya está asignado a una comisión
      const existingAssignment = await db.collection('studentCommissions').findOne({
        studentId: existingStudent._id,
        eventbriteEventId: event.id
      });

      if (existingAssignment) {
        // Si ya existe la asignación, actualizamos el ticket ID por si cambió
        await db.collection('studentCommissions').updateOne(
          { _id: existingAssignment._id },
          { 
            $set: { 
              eventbriteTicketId: ticketData.id,
              updatedAt: new Date()
            }
          }
        );
        return NextResponse.json({ message: 'Asignación actualizada correctamente' });
      }

      // Crear la asignación para el estudiante existente
      await db.collection('studentCommissions').insertOne({
        studentId: existingStudent._id,
        eventbriteEventId: event.id,
        eventbriteTicketId: ticketData.id,
        enrollmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Crear nuevo estudiante
      const hashedPassword = await bcrypt.hash(dni, 10); // Usar DNI como contraseña
      const studentResult = await db.collection('users').insertOne({
        dni,
        email: ticketData.email,
        name: ticketData.name,
        password: hashedPassword,
        role: 'student',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Crear la asignación para el nuevo estudiante
      await db.collection('studentCommissions').insertOne({
        studentId: studentResult.insertedId,
        eventbriteEventId: event.id,
        eventbriteTicketId: ticketData.id,
        enrollmentDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    return NextResponse.json({ message: 'Webhook procesado correctamente' });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    return NextResponse.json(
      { error: 'Error procesando webhook' },
      { status: 500 }
    );
  }
} 