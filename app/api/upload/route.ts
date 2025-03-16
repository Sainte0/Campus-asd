import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { mkdir } from 'fs/promises';

export async function POST(request: Request) {
  try {
    console.log('📥 Iniciando proceso de subida de archivo...');
    
    const session = await getServerSession(options);
    
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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear un nombre de archivo único
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${timestamp}-${originalName}`;
    console.log('📄 Nombre del archivo:', fileName);

    // Asegurarse de que el directorio existe
    const uploadDir = join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (error) {
      if ((error as any).code !== 'EEXIST') {
        console.error('❌ Error al crear directorio:', error);
        throw error;
      }
    }

    const filePath = join(uploadDir, fileName);
    console.log('📁 Ruta del archivo:', filePath);

    try {
      await writeFile(filePath, buffer);
      console.log('✅ Archivo guardado exitosamente');
    } catch (error) {
      console.error('❌ Error al escribir el archivo:', error);
      throw new Error('Error al guardar el archivo');
    }

    // Devolver la URL del archivo
    const fileUrl = `/uploads/${fileName}`;
    console.log('🔗 URL del archivo:', fileUrl);

    return NextResponse.json({ fileUrl });
  } catch (error) {
    console.error('❌ Error al subir el archivo:', error);
    return NextResponse.json(
      { error: 'Error al procesar el archivo', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
} 