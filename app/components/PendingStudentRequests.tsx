'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface StudentRequest {
  _id: string;
  nombre: string;
  apellido: string;
  email: string;
  documento: string;
  status: string;
  createdAt: string;
}

export default function PendingStudentRequests() {
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/students/requests');
      if (!response.ok) throw new Error('Error al cargar las solicitudes');
      const data = await response.json();
      setRequests(data.requests);
    } catch (error) {
      toast.error('Error al cargar las solicitudes');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (requestId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta solicitud?')) {
      return;
    }

    try {
      const response = await fetch(`/api/students/requests/${requestId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Error al eliminar la solicitud');
      
      toast.success('Solicitud eliminada');
      fetchRequests(); // Recargar la lista
    } catch (error) {
      toast.error('Error al eliminar la solicitud');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Cargando solicitudes...</div>;
  }

  if (requests.length === 0) {
    return <div className="text-center py-4 text-gray-600">No hay solicitudes pendientes</div>;
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          Solicitudes de Acceso Pendientes
        </h3>
        <p className="mt-1 text-sm text-gray-600">
          Lista de estudiantes que han solicitado acceso al campus. Verifique su inscripción en Eventbrite 
          antes de sincronizar los datos.
        </p>
      </div>
      <div className="border-t border-gray-200">
        <ul className="divide-y divide-gray-200">
          {requests.map((request) => (
            <li key={request._id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-primary truncate">
                      {request.nombre} {request.apellido}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        Pendiente
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {request.email}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Documento: {request.documento}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Solicitado el: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="ml-5 flex-shrink-0">
                  <button
                    onClick={() => handleDelete(request._id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 