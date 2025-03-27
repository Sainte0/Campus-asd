import { NextResponse } from 'next/server';
import { authOptions } from '../auth/config';
import { getServerSession } from 'next-auth';
import { connectToDatabase } from '@/lib/mongodb';

// Nueva configuración de la ruta usando la sintaxis de Next.js 14
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    console.log('📥 Iniciando proceso de subida de archivo...');
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      console.log('❌ Acceso no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      console.log('❌ No se proporcionó ningún archivo');
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      );
    }

    // Verificar el tipo de archivo
    console.log('📝 Tipo de archivo:', file.type);
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      console.log('❌ Tipo de archivo no permitido:', file.type);
      return NextResponse.json(
        { error: 'Tipo de archivo no permitido. Solo se permiten archivos PDF y DOC/DOCX.' },
        { status: 400 }
      );
    }

    // Verificar el tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      console.log('❌ Archivo demasiado grande:', file.size);
      return NextResponse.json(
        { error: 'El archivo es demasiado grande. El tamaño máximo es 10MB.' },
        { status: 400 }
      );
    }

    // Convertir el archivo a un buffer y luego a base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64File = buffer.toString('base64');

    try {
      console.log('📤 Guardando archivo en MongoDB...');
      
      const { db } = await connectToDatabase();
      
      // Crear un documento para el archivo
      const fileDoc = {
        name: file.name,
        type: file.type,
        size: file.size,
        content: base64File,
        uploadedAt: new Date(),
        uploadedBy: session.user.email
      };

      // Guardar en la colección 'files'
      const result = await db.collection('files').insertOne(fileDoc);

      console.log('✅ Archivo guardado exitosamente en MongoDB');
      return NextResponse.json({ 
        fileId: result.insertedId.toString(),
        fileName: file.name
      });

    } catch (error) {
      console.error('❌ Error al guardar archivo en MongoDB:', error);
      return NextResponse.json(
        { 
          error: 'Error al guardar el archivo en MongoDB',
          details: error instanceof Error ? error.message : 'Error desconocido'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ Error al procesar el archivo:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 