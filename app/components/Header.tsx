'use client';

import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <header>
      <div className="asd-banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Image
                src="/logo2.jpeg"
                alt="ASD Logo"
                width={180}
                height={60}
                className="asd-logo"
                priority
              />
            </div>
          </div>
        </div>
      </div>
      
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-primary">Campus Virtual - {session?.user?.role === 'student' ? 'Estudiante' : 'Administrador'}</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">{session?.user?.name}</span>
              <button
                onClick={() => router.push('/api/auth/signout')}
                className="btn-primary bg-red-500 hover:bg-red-600"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
} 