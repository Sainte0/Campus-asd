'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<string>('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  const handleEventSelect = (eventId: string) => {
    setSelectedEvent(eventId);
  };

  const handleSync = async () => {
    if (!selectedEvent) {
      toast.error('Por favor, seleccione un evento primero');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas sincronizar los estudiantes de Eventbrite?')) {
      return;
    }

    setSyncing(true);
    setError('');
    setSyncResult(null);

    try {
      const response = await fetch('/api/sync/eventbrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Error al sincronizar estudiantes');
      }

      const data = await response.json();
      setSyncResult(data.results);

      if (data.status === 'success') {
        toast.success('Sincronización completada exitosamente');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al sincronizar estudiantes');
      toast.error('Error en la sincronización');
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteAllStudents = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar TODOS los estudiantes? Esta acción no se puede deshacer.')) {
      return;
    }

    if (!confirm('Esta acción eliminará PERMANENTEMENTE todos los estudiantes. ¿Deseas continuar?')) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/students/delete-all', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al eliminar estudiantes');
      }

      const data = await response.json();
      setSyncResult({
        message: `Se eliminaron ${data.deletedCount} estudiantes correctamente`
      });
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar estudiantes');
    } finally {
      setDeleting(false);
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
              <h1 className="text-xl font-semibold text-gray-900">Panel de Administrador</h1>
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
          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {syncResult && (
            <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              <p>{typeof syncResult === 'string' ? syncResult : syncResult.message || 'Operación completada exitosamente'}</p>
              {syncResult.created !== undefined && (
                <ul className="list-disc list-inside">
                  <li>Nuevos estudiantes: {syncResult.created}</li>
                  <li>Estudiantes actualizados: {syncResult.updated}</li>
                  <li>Errores: {syncResult.errors}</li>
                </ul>
              )}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/admin/dashboard/sections"
              className="bg-white overflow-hidden shadow-sm rounded-lg hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">Gestionar Secciones</h2>
                <p className="text-gray-600">
                  Crear, editar y eliminar secciones del curso
                </p>
              </div>
            </Link>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">Sincronizar Estudiantes</h2>
                <p className="text-gray-600 mb-4">
                  Importar estudiantes desde Eventbrite
                </p>

                {/* Selector de Evento */}
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Seleccionar Evento</h3>
                  <div className="space-y-2">
                    <button
                      onClick={() => handleEventSelect(process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1 || '')}
                      className={`w-full p-3 rounded-lg border ${
                        selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h4 className="font-medium">Evento 1</h4>
                      <p className="text-sm text-gray-600">ID: {process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_1}</p>
                    </button>

                    <button
                      onClick={() => handleEventSelect(process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2 || '')}
                      className={`w-full p-3 rounded-lg border ${
                        selectedEvent === process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <h4 className="font-medium">Evento 2</h4>
                      <p className="text-sm text-gray-600">ID: {process.env.NEXT_PUBLIC_EVENTBRITE_EVENT_ID_2}</p>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleSync}
                  disabled={syncing || !selectedEvent}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    syncing || !selectedEvent
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
                
                {syncResult && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Resultados de la sincronización:</h3>
                    <p>Total procesados: {syncResult.total}</p>
                    <p>Estudiantes creados/actualizados: {syncResult.processed}</p>
                    <p>Omitidos: {syncResult.skipped}</p>
                    <p>Errores: {syncResult.errors}</p>
                  </div>
                )}
                
                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-2">Eliminar Estudiantes</h2>
                <p className="text-gray-600 mb-4">
                  Eliminar todos los estudiantes de la base de datos
                </p>
                <button
                  onClick={handleDeleteAllStudents}
                  disabled={deleting}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    deleting
                      ? 'bg-red-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                >
                  {deleting ? 'Eliminando...' : 'Eliminar Todos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 