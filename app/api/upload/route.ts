import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { options } from '../auth/[...nextauth]/options';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar el tamaño máximo de archivo
export const config = {
  api: {
    bodyParser: false
  }
};

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
    const uploadStr = `data:${file.type};base64,${base64File}`;

    try {
      console.log('📤 Subiendo archivo a Cloudinary...');
      
      const uploadResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(uploadStr, {
          resource_type: 'auto',
          folder: 'campus-virtual',
          format: file.name.split('.').pop()?.toLowerCase(),
          public_id: `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9]/g, '_')}`.replace(/\.[^/.]+$/, '')
        }, (error, result) => {
          if (error) {
            console.error('❌ Error de Cloudinary:', error);
            reject(error);
          } else {
            console.log('✅ Respuesta de Cloudinary:', result);
            resolve(result);
          }
        });
      });

      console.log('✅ Archivo subido exitosamente a Cloudinary');
      return NextResponse.json({ 
        fileUrl: (uploadResponse as any).secure_url 
      });

    } catch (error) {
      console.error('❌ Error al subir archivo a Cloudinary:', error);
      return NextResponse.json(
        { 
          error: 'Error al subir el archivo a Cloudinary',
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