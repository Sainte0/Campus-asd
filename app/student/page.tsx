'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Section {
  _id: string;
  title: string;
  description: string;
  weekNumber: number;
  videoUrl: string;
  pdfUrl?: string;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    } else if (session?.user?.role !== 'student') {
      router.push('/');
    } else {
      fetchSections();
    }
  }, [session, status, router]);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections');
      if (!response.ok) {
        throw new Error('Error al obtener las secciones');
      }
      const data = await response.json();
      // Asegurarse de que data sea un array
      setSections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error:', error);
      setError('Error al cargar las secciones');
      setSections([]); // Establecer un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Campus Virtual - Estudiante</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">{session?.user?.name}</span>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {sections && sections.length > 0 ? (
              sections.map((section) => (
                <div
                  key={section._id}
                  className="bg-white overflow-hidden shadow rounded-lg"
                >
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-2">
                      Semana {section.weekNumber}: {section.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{section.description}</p>
                    
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-lg font-medium mb-2">Video de la Clase</h3>
                        <div className="aspect-w-16 aspect-h-9">
                          <iframe
                            src={section.videoUrl.replace('watch?v=', 'embed/')}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-64 rounded-lg"
                          ></iframe>
                        </div>
                      </div>

                      {section.pdfUrl && (
                        <div>
                          <h3 className="text-lg font-medium mb-2">Material de Apoyo</h3>
                          <a
                            href={section.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                          >
                            Ver PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-500">
                  Aún no hay contenido disponible.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 