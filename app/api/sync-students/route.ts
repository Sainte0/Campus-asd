import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { getEventbriteAttendees } from '@/lib/eventbrite';
import connectDB from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(options);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener asistentes de Eventbrite
    const attendees = await getEventbriteAttendees();

    // Conectar a la base de datos
    await connectDB();

    const results = {
      created: 0,
      updated: 0,
      errors: 0,
    };

    // Procesar cada asistente
    for (const attendee of attendees) {
      try {
        // Generar una contraseña temporal
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Buscar o crear el usuario
        const existingUser = await User.findOne({ email: attendee.profile.email });

        if (existingUser) {
          // Actualizar usuario existente
          await User.updateOne(
            { email: attendee.profile.email },
            {
              $set: {
                name: `${attendee.profile.first_name} ${attendee.profile.last_name}`,
                eventbriteId: attendee.id,
                role: 'student',
              },
            }
          );
          results.updated++;
        } else {
          // Crear nuevo usuario
          await User.create({
            email: attendee.profile.email,
            name: `${attendee.profile.first_name} ${attendee.profile.last_name}`,
            password: hashedPassword,
            eventbriteId: attendee.id,
            role: 'student',
            tempPassword: tempPassword, // Guardar la contraseña temporal para enviarla por email
          });
          results.created++;
        }
      } catch (error) {
        console.error('Error processing attendee:', attendee.id, error);
        results.errors++;
      }
    }

    return NextResponse.json({
      message: 'Sincronización completada',
      results,
    });
  } catch (error) {
    console.error('Error en la sincronización:', error);
    return NextResponse.json(
      { error: 'Error en la sincronización' },
      { status: 500 }
    );
  }
} 