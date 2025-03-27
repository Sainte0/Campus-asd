import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';

interface StudentData {
  dni: string;
  name: string;
  email: string;
  role: string;
  eventId: string;
  commission?: string;
}

export async function createStudent(studentData: StudentData) {
  const { db } = await connectToDatabase();
  const usersCollection = db.collection('users');

  const result = await usersCollection.updateOne(
    { email: studentData.email },
    {
      $setOnInsert: {
        documento: studentData.dni,
        name: studentData.name,
        email: studentData.email,
        role: studentData.role,
        eventId: studentData.eventId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    { upsert: true }
  );

  if (result.upsertedCount === 1) {
    return {
      _id: result.upsertedId,
      ...studentData,
      documento: studentData.dni
    };
  }

  const existingUser = await usersCollection.findOne({ email: studentData.email });
  return existingUser;
}

export async function updateStudent(studentId: string | ObjectId, studentData: Partial<StudentData>) {
  const { db } = await connectToDatabase();
  const usersCollection = db.collection('users');

  const id = typeof studentId === 'string' ? new ObjectId(studentId) : studentId;

  const updateData = {
    ...studentData,
    ...(studentData.dni && { documento: studentData.dni }),
    updatedAt: new Date()
  };

  const result = await usersCollection.updateOne(
    { _id: id },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw new Error('Estudiante no encontrado');
  }

  return result;
} 