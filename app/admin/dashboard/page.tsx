'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session || session.user?.role !== 'admin') {
      router.push('/');
    }
  }, [session, status, router]);

  const handleSync = async () => {
    if (!confirm('¿Estás seguro de que deseas sincronizar los estudiantes de Eventbrite?')) {
      return;
    }

    setSyncing(true);
    setError('');
    setSyncResult(null);

    try {
      const response = await fetch('/api/sync-students', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al sincronizar estudiantes');
      }

      const data = await response.json();
      setSyncResult(data.results);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al sincronizar estudiantes');
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
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                    syncing
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
                >
                  {syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
                </button>
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