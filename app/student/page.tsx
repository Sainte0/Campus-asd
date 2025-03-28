'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';

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
    <div className="min-h-screen bg-background-light">
      <Header />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="page-title">Mis Secciones</h1>
          
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
                  className="card"
                >
                  <div className="p-6">
                    <h2 className="section-title">
                      Semana {section.weekNumber}: {section.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{section.description}</p>
                    
                    <div className="space-x-4">
                      <a
                        href={section.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary"
                      >
                        Ver Video
                      </a>
                      {section.pdfUrl && (
                        <a
                          href={section.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary bg-green-600 hover:bg-green-700"
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