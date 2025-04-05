'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ResetPasswordPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [documento, setDocumento] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Verificar si el usuario es administrador
  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!session || session.user?.role !== 'admin') {
    router.push('/admin/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, documento }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, message: data.message });
        toast.success('Contraseña actualizada correctamente');
      } else {
        setResult({ success: false, message: data.message });
        toast.error(data.message || 'Error al actualizar la contraseña');
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({ success: false, message: 'Error al procesar la solicitud' });
      toast.error('Error al procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Restablecer Contraseña</h1>
        
        {result && (
          <div className={`mb-4 p-4 rounded ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {result.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email del estudiante
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="estudiante@ejemplo.com"
            />
          </div>

          <div>
            <label htmlFor="documento" className="block text-sm font-medium text-gray-700">
              Nuevo documento
            </label>
            <input
              id="documento"
              type="text"
              required
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Número de documento"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Restablecer Contraseña'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/admin/dashboard')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Volver al panel de administración
          </button>
        </div>
      </div>
    </div>
  );
} 