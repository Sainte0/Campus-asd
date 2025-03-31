'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '../components/Header';
import Footer from '../components/Footer';

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

function getYouTubeEmbedUrl(url: string) {
  try {
    // Handle standard YouTube URLs (watch?v=)
    let videoId = url.split('v=')[1]?.split('&')[0];
    
    if (!videoId) {
      // Handle youtu.be URLs
      videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    
    if (!videoId) {
      // Handle embed URLs
      videoId = url.split('embed/')[1]?.split('?')[0];
    }
    
    if (!videoId) {
      // Handle shorts URLs
      videoId = url.split('shorts/')[1]?.split('?')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

function getGoogleDocsPreviewUrl(url: string) {
  try {
    // Si la URL es una ruta de la API o una ruta relativa
    if (url.startsWith('/') || url.startsWith('http://localhost') || url.startsWith('https://campus-asd.vercel.app')) {
      // Usamos la URL directamente ya que el documento viene de nuestra API/BD
      return url;
    }
    // Handle Google Docs URLs
    else if (url.includes('docs.google.com')) {
      if (url.includes('/edit')) {
        return url.replace('/edit', '/preview');
      } else if (url.includes('/view')) {
        return url;
      } else {
        return url + '/preview';
      }
    }
    // Handle Google Drive URLs
    else if (url.includes('drive.google.com')) {
      const fileId = url.match(/\/d\/(.*?)(\/|$)/)?.[1];
      if (fileId) {
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    return url;
  } catch {
    return url;
  }
}

function isPdfUrl(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf');
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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="loading-spinner" />
        <span className="ml-3">Cargando...</span>
      </div>
    );
  }

  if (!session || session.user?.role !== 'student') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="page-title">Mis Clases</h1>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="loading-spinner" />
              <span className="ml-3">Cargando clases...</span>
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <p className="text-gray-600">No hay clases disponibles en este momento.</p>
            </div>
          ) : (
            <div className="grid gap-8">
              {sections.map((section) => {
                const embedUrl = getYouTubeEmbedUrl(section.videoUrl);
                const docsPreviewUrl = section.pdfUrl ? getGoogleDocsPreviewUrl(section.pdfUrl) : null;
                const isPdf = section.pdfUrl ? isPdfUrl(section.pdfUrl) : false;
                
                return (
                  <div key={section._id} className="card overflow-hidden">
                    <div className="p-6">
                      <h2 className="section-title">
                        Clase {section.weekNumber}: {section.title}
                      </h2>
                      <p className="text-gray-600 mb-6">{section.description}</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 px-6 pb-6">
                      <div className="space-y-4">
                        <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                          {embedUrl ? (
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <p className="text-gray-500">Vista previa no disponible</p>
                            </div>
                          )}
                        </div>
                        <a
                          href={section.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary w-full justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                          </svg>
                          Ver Video Completo
                        </a>
                      </div>

                      {section.pdfUrl && (
                        <div className="space-y-4">
                          <div className="h-[400px] bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                            {docsPreviewUrl ? (
                              isPdf ? (
                                <object
                                  data={docsPreviewUrl}
                                  type="application/pdf"
                                  className="w-full h-full"
                                >
                                  <iframe
                                    src={docsPreviewUrl}
                                    className="w-full h-full"
                                    allowFullScreen
                                  />
                                </object>
                              ) : (
                                <iframe
                                  src={docsPreviewUrl}
                                  className="w-full h-full"
                                  allowFullScreen
                                />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <p className="text-gray-500">Vista previa no disponible</p>
                              </div>
                            )}
                          </div>
                          <a
                            href={section.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary bg-green-600 hover:bg-green-700 w-full justify-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Ver Documento Completo
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {renderPagination()}
        </div>
      </main>

      <Footer />
    </div>
  );
} 