import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    console.log('📥 Iniciando descarga de archivo...');
    
    const session = await getServerSession(options);
    
    if (!session?.user) {
      console.log('❌ Acceso no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { fileId } = params;
    
    if (!fileId) {
      console.log('❌ No se proporcionó ID del archivo');
      return NextResponse.json(
        { error: 'ID de archivo no proporcionado' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    // Buscar el archivo en MongoDB
    const file = await db.collection('files').findOne({
      _id: new ObjectId(fileId)
    });

    if (!file) {
      console.log('❌ Archivo no encontrado');
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }

    // Convertir el contenido base64 a buffer
    const buffer = Buffer.from(file.content, 'base64');

    // Crear la respuesta con el archivo
    const response = new NextResponse(buffer);

    // Configurar los headers apropiados
    response.headers.set('Content-Type', file.type);
    response.headers.set('Content-Disposition', `attachment; filename="${file.name}"`);
    response.headers.set('Content-Length', buffer.length.toString());

    console.log('✅ Archivo enviado exitosamente');
    return response;

  } catch (error) {
    console.error('❌ Error al descargar archivo:', error);
    return NextResponse.json(
      { 
        error: 'Error al descargar el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 