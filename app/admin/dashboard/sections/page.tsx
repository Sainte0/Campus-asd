'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Section {
  _id: string;
  title: string;
  description: string;
  weekNumber: number;
  videoUrl: string;
  pdfUrl?: string;
}

export default function SectionsManagement() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // Estado para el formulario
  const [weekNumber, setWeekNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
    } else {
      fetchSections();
    }
  }, [session, status, router]);

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/sections');
      const data = await response.json();
      setSections(Array.isArray(data) ? data : []);
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

  const uploadFile = async () => {
    if (!selectedFile) return null;

    setUploadingFile(true);
    setError('');
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('📤 Iniciando subida de archivo:', selectedFile.name);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('❌ Error en la respuesta:', data);
        throw new Error(data.details || data.error || 'Error al subir el archivo');
      }

      console.log('✅ Archivo subido exitosamente:', data.fileUrl);
      return data.fileUrl;
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

    try {
      let fileUrl = pdfUrl;
      if (selectedFile) {
        fileUrl = await uploadFile();
      }

      const sectionData = {
        weekNumber: parseInt(weekNumber),
        title,
        description,
        videoUrl,
        pdfUrl: fileUrl,
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
      await fetchSections();
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
        fileUrl = await uploadFile();
      }

      const sectionData = {
        weekNumber: parseInt(weekNumber),
        title,
        description,
        videoUrl,
        pdfUrl: fileUrl,
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
      await fetchSections();
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
      await fetchSections();
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar la sección');
    }
  };

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!session || session.user?.role !== 'admin') {
    return null;
  }

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
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingSection ? 'Editar Sección' : 'Crear Nueva Sección'}
            </h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
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
                        <a
                          href={section.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Ver PDF
                        </a>
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 