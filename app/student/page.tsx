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
  eventId: string;
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'student') {
      router.push('/');
    } else {
      fetchSections();
    }
  }, [session, status, router]);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections/student');
      const data = await response.json();
      if (response.ok) {
        setSections(data.sections);
      } else {
        throw new Error(data.error || 'Error al cargar las secciones');
      }
    } catch (error) {
      console.error('Error al obtener secciones:', error);
      setError('Error al cargar las secciones');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const renderPagination = () => {
    if (!paginationInfo || paginationInfo.pages <= 1) return null;

    return (
      <div className="flex justify-center mt-8 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 rounded ${
            currentPage === 1
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Anterior
        </button>
        <span className="px-4 py-2">
          Página {currentPage} de {paginationInfo.pages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === paginationInfo.pages}
          className={`px-4 py-2 rounded ${
            currentPage === paginationInfo.pages
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Siguiente
        </button>
      </div>
    );
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!session || session.user?.role !== 'student') {
    return null;
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
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Mis Secciones</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <p>Cargando secciones...</p>
          ) : sections.length === 0 ? (
            <p>No hay secciones disponibles.</p>
          ) : (
            <div className="grid gap-6">
              {sections.map((section) => (
                <div
                  key={section._id}
                  className="bg-white overflow-hidden shadow-sm rounded-lg"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-semibold mb-2">
                      Semana {section.weekNumber}: {section.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{section.description}</p>
                    
                    <div className="space-x-4">
                      <a
                        href={section.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Ver Video
                      </a>
                      {section.pdfUrl && (
                        <a
                          href={section.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          Ver PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {renderPagination()}
        </div>
      </main>
    </div>
  );
} 