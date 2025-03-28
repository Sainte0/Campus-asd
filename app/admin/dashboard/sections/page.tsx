'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

interface Section {
  _id: string;
  title: string;
  description: string;
  weekNumber: number;
  videoUrl: string;
  pdfUrl?: string;
  eventId: string;
  instructor: 'marion' | 'david';
  commissionGroup: 'marion' | 'david';
}

interface PaginationInfo {
  total: number;
  pages: number;
  currentPage: number;
  perPage: number;
}

export default function SectionsManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [selectedSubEvent, setSelectedSubEvent] = useState<'david' | 'marion' | null>(null);

  // Estado para el formulario
  const [weekNumber, setWeekNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [instructor, setInstructor] = useState<'marion' | 'david'>('marion');
  const [commissionGroup, setCommissionGroup] = useState<'marion' | 'david'>('marion');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo | null>(null);

  const [syncingStudents, setSyncingStudents] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResults, setSyncResults] = useState<any>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
    } else {
      if (selectedEvent) {
        // Si es el Evento 1, solo cargar secciones si hay un sub-evento seleccionado
        if (selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1) {
          if (selectedSubEvent) {
            fetchSections(currentPage);
          }
        } else {
          fetchSections(currentPage);
        }
      }
    }
  }, [session, status, router, currentPage, selectedEvent, selectedSubEvent]);

  const fetchSections = async (page: number = 1) => {
    try {
      let url = `/api/sections?page=${page}&limit=10&eventId=${selectedEvent}`;
      
      // Si es el Evento 1 y hay un sub-evento seleccionado, agregar el filtro de instructor
      if (selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 && selectedSubEvent) {
        url += `&instructor=${selectedSubEvent}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (response.ok) {
        setSections(data.sections);
        setPaginationInfo(data.pagination);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar el tipo de archivo
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setError('Solo se permiten archivos PDF y DOC/DOCX');
      e.target.value = ''; // Limpiar el input
      return;
    }

    // Verificar el tamaño del archivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB en bytes
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. El tamaño máximo es 10MB');
      e.target.value = ''; // Limpiar el input
      return;
    }

    setSelectedFile(file);
    setError('');
  };

  const uploadFile = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined;

    setUploadingFile(true);
    setError('');
    
    try {
      console.log('📤 Preparando archivo para subida:', selectedFile.name);
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('❌ Error al parsear la respuesta:', e);
        throw new Error('Error en el servidor al procesar el archivo');
      }

      if (!response.ok) {
        console.error('❌ Error en la respuesta:', data);
        throw new Error(data.details || data.error || 'Error al subir el archivo');
      }

      console.log('✅ Archivo subido exitosamente:', data);
      // Construir la URL para descargar el archivo
      return `/api/download/${data.fileId}`;
    } catch (error) {
      console.error('❌ Error al subir el archivo:', error);
      setError(error instanceof Error ? error.message : 'Error al subir el archivo');
      throw error;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEvent) {
      setError('Por favor, seleccione un evento');
      return;
    }

    try {
      let fileUrl = pdfUrl;
      if (selectedFile) {
        const uploadedFileUrl = await uploadFile();
        if (uploadedFileUrl) {
          fileUrl = uploadedFileUrl;
        }
      }

      const sectionData = {
        weekNumber: parseInt(weekNumber),
        title,
        description,
        videoUrl,
        pdfUrl: fileUrl,
        eventId: selectedEvent,
        instructor: selectedSubEvent || 'marion',
        commissionGroup: selectedSubEvent || 'marion',
      };

      const response = await fetch('/api/sections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear la sección');
      }

      // Limpiar el formulario
      setWeekNumber('');
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setPdfUrl('');
      setSelectedFile(null);
      if (e.target instanceof HTMLFormElement) {
        e.target.reset();
      }

      // Actualizar la lista de secciones
      await fetchSections(currentPage);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al crear la sección');
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);
    setWeekNumber(section.weekNumber.toString());
    setTitle(section.title);
    setDescription(section.description);
    setVideoUrl(section.videoUrl);
    setPdfUrl(section.pdfUrl || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    try {
      let fileUrl = pdfUrl;
      if (selectedFile) {
        const uploadedFileUrl = await uploadFile();
        if (uploadedFileUrl) {
          fileUrl = uploadedFileUrl;
        }
      }

      const sectionData = {
        weekNumber: parseInt(weekNumber),
        title,
        description,
        videoUrl,
        pdfUrl: fileUrl,
        eventId: selectedEvent,
        instructor: selectedSubEvent || 'marion',
        commissionGroup: selectedSubEvent || 'marion',
      };

      const response = await fetch(`/api/sections/${editingSection._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sectionData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar la sección');
      }

      // Limpiar el formulario y estado de edición
      setEditingSection(null);
      setWeekNumber('');
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setPdfUrl('');
      setSelectedFile(null);
      if (e.target instanceof HTMLFormElement) {
        e.target.reset();
      }

      // Actualizar la lista de secciones
      await fetchSections(currentPage);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al actualizar la sección');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta sección?')) {
      return;
    }

    try {
      const response = await fetch(`/api/sections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar la sección');
      }

      // Actualizar la lista de secciones
      await fetchSections(currentPage);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar la sección');
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const syncStudents = async () => {
    try {
      setSyncingStudents(true);
      setSyncProgress(0);
      setSyncResults(null);

      const response = await fetch('/api/sync-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setSyncResults(data);

      if (data.success) {
        toast.success('Sincronización completada');
        if (data.nextBatch) {
          toast(`${data.results.pending.length} estudiantes pendientes. Por favor, sincronice nuevamente.`, {
            icon: 'ℹ️',
            duration: 5000
          });
        }
      } else {
        toast.error('Error en la sincronización');
      }
    } catch (error) {
      console.error('Error syncing students:', error);
      toast.error('Error en la sincronización');
    } finally {
      setSyncingStudents(false);
    }
  };

  const handleEventSelect = (eventId: string) => {
    setSelectedEvent(eventId);
    setSelectedSubEvent(null); // Reset sub-event selection when changing events
  };

  const handleSubEventSelect = (subEvent: 'david' | 'marion') => {
    setSelectedSubEvent(subEvent);
    // Set the instructor and commissionGroup based on the selected sub-event
    setInstructor(subEvent);
    setCommissionGroup(subEvent);
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

  const renderPagination = () => {
    if (!paginationInfo) return null;

    return (
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${
            currentPage === 1
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          Anterior
        </button>
        <span className="px-3 py-1">
          Página {currentPage} de {paginationInfo.pages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === paginationInfo.pages}
          className={`px-3 py-1 rounded ${
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra de navegación */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                href="/admin/dashboard"
                className="text-blue-600 hover:text-blue-800 mr-4"
              >
                ← Volver al Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Gestionar Secciones</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{session.user?.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Selector de Evento */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Seleccionar Evento</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <button
                  onClick={() => handleEventSelect(process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 || '')}
                  className={`w-full p-4 rounded-lg border ${
                    selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <h3 className="font-medium">Evento 1</h3>
                  <p className="text-sm text-gray-600">ID: {process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1}</p>
                </button>
                
                {selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSubEventSelect('david')}
                      className={`p-3 rounded-lg border ${
                        selectedSubEvent === 'david'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h4 className="font-medium">David</h4>
                    </button>
                    <button
                      onClick={() => handleSubEventSelect('marion')}
                      className={`p-3 rounded-lg border ${
                        selectedSubEvent === 'marion'
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h4 className="font-medium">Marion</h4>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleEventSelect(process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2 || '')}
                className={`p-4 rounded-lg border ${
                  selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <h3 className="font-medium">Evento 2</h3>
                <p className="text-sm text-gray-600">ID: {process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2}</p>
              </button>
            </div>
          </div>

          {/* Formulario de Sección */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSection ? 'Editar Sección' : 'Crear Nueva Sección'}
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {!selectedEvent && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                Por favor, seleccione un evento para comenzar
              </div>
            )}

            {selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 && !selectedSubEvent && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
                Por favor, seleccione el instructor (David o Marion) para el Evento 1
              </div>
            )}

            <form onSubmit={editingSection ? handleUpdate : handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Número de Semana
                </label>
                <input
                  type="number"
                  name="weekNumber"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Título
                </label>
                <input
                  type="text"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  URL del Video (YouTube)
                </label>
                <input
                  type="url"
                  name="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Archivo PDF/DOC (opcional)
                </label>
                <div className="mt-1 flex items-center">
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx"
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100
                      disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={uploadingFile}
                  />
                  {selectedFile && (
                    <span className="ml-2 text-sm text-gray-500">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">
                    {error}
                  </p>
                )}
                {uploadingFile && (
                  <p className="mt-2 text-sm text-blue-600">
                    Subiendo archivo...
                  </p>
                )}
                {pdfUrl && !selectedFile && (
                  <div className="mt-2">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Ver archivo actual
                    </a>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={uploadingFile}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    uploadingFile
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {uploadingFile
                    ? 'Subiendo archivo...'
                    : editingSection
                    ? 'Actualizar Sección'
                    : 'Crear Sección'}
                </button>

                {editingSection && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(null);
                      setWeekNumber('');
                      setTitle('');
                      setDescription('');
                      setVideoUrl('');
                      setPdfUrl('');
                      setSelectedFile(null);
                    }}
                    className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancelar Edición
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Secciones Existentes</h2>
            {loading ? (
              <p>Cargando secciones...</p>
            ) : sections.length === 0 ? (
              <p>No hay secciones creadas aún.</p>
            ) : (
              <>
                <div className="grid gap-4">
                  {sections.map((section) => (
                    <div
                      key={section._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <h4 className="text-lg font-medium">
                        Semana {section.weekNumber}: {section.title}
                      </h4>
                      <p className="text-gray-600 mt-1">{section.description}</p>
                      <div className="mt-2 space-x-2">
                        <a
                          href={section.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Ver Video
                        </a>
                        {section.pdfUrl && (
                          <div className="space-x-2">
                            <a
                              href={section.pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Ver PDF
                            </a>
                            <a
                              href={`${section.pdfUrl}?download=true`}
                              className="text-blue-600 hover:text-blue-800"
                              download
                            >
                              Descargar PDF
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => handleEdit(section)}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(section._id)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                {renderPagination()}
              </>
            )}
          </div>

          {/* Botón de sincronización */}
          <button
            onClick={syncStudents}
            disabled={syncingStudents}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2"
          >
            {syncingStudents ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sincronizando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Sincronizar estudiantes
              </>
            )}
          </button>

          {syncResults && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg">
              <h3 className="font-semibold mb-2">Resultados de la sincronización:</h3>
              <p>Total de estudiantes: {syncResults.results.totalStudents}</p>
              <p>Estudiantes creados: {syncResults.results.created}</p>
              <p>Estudiantes actualizados: {syncResults.results.updated}</p>
              <p>Errores: {syncResults.results.errors}</p>
              {syncResults.results.pending.length > 0 && (
                <div className="mt-2">
                  <p className="text-yellow-600 font-semibold">
                    {syncResults.results.pending.length} estudiantes pendientes
                  </p>
                  <p className="text-sm text-gray-600">
                    Por favor, haga clic en "Sincronizar estudiantes" nuevamente para procesar el siguiente lote.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 