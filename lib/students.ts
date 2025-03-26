import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';

interface StudentData {
  dni: string;
  name: string;
  email: string;
  role: string;
  eventId: string;
}

export async function createStudent(studentData: StudentData) {
  const { db } = await connectToDatabase();
  const usersCollection = db.collection('users');

  const result = await usersCollection.insertOne({
    ...studentData,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return {
    _id: result.insertedId,
    ...studentData
  };
}

export async function updateStudent(studentId: string | ObjectId, studentData: Partial<StudentData>) {
  const { db } = await connectToDatabase();
  const usersCollection = db.collection('users');

  const id = typeof studentId === 'string' ? new ObjectId(studentId) : studentId;

  const result = await usersCollection.updateOne(
    { _id: id },
    {
      $set: {
        ...studentData,
        updatedAt: new Date()
      }
    }
  );

  if (result.matchedCount === 0) {
    throw new Error('Estudiante no encontrado');
  }

  return result;
} 