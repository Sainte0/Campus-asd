import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../../auth/[...nextauth]/options';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Cache duration: 1 hora
const CACHE_DURATION = 60 * 60;

export async function GET(
  request: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    console.log('📥 Iniciando proceso de archivo...');
    
    const session = await getServerSession(options);
    
    if (!session?.user) {
      console.log('❌ Acceso no autorizado');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { fileId } = params;
    const url = new URL(request.url);
    const forceDownload = url.searchParams.get('download') === 'true';
    
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
    
    // Si es un PDF y no se solicita descarga, mostrarlo en el navegador
    if (file.type === 'application/pdf' && !forceDownload) {
      response.headers.set('Content-Disposition', 'inline');
      // Agregar headers de caché para PDFs
      response.headers.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
      response.headers.set('ETag', `"${fileId}-${file.size}"`);
    } else {
      response.headers.set('Content-Disposition', `attachment; filename="${file.name}"`);
      // No cachear descargas
      response.headers.set('Cache-Control', 'no-store');
    }
    
    response.headers.set('Content-Length', buffer.length.toString());

    console.log('✅ Archivo enviado exitosamente');
    return response;

  } catch (error) {
    console.error('❌ Error al procesar archivo:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar el archivo',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
} 