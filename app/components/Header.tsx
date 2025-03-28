'use client';

import Image from 'next/image';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export function Header() {
  const { data: session } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ 
      redirect: true,
      callbackUrl: '/api/auth/signout'
    });
  };

  return (
    <header>
      <div className="campus-banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <Image
                  src="/judiciales.jpeg"
                  alt="Judiciales Córdoba Logo"
                  width={140}
                  height={60}
                  className="campus-logo"
                  priority
                />
                <div className="h-12 w-px bg-white/30" />
                <Image
                  src="/asd.jpeg"
                  alt="ASD Logo"
                  width={140}
                  height={60}
                  className="campus-logo"
                  priority
                />
              </div>
              <div className="h-12 w-px bg-white/30 hidden sm:block" />
              <h2 className="text-white text-xl font-semibold hidden sm:block">
                Campus Virtual
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-white hover:text-white/80 transition">
                Soporte
              </a>
              <a href="#" className="text-white hover:text-white/80 transition">
                Contacto
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-primary">
                Campus Virtual ASD - {session?.user?.role === 'student' ? 'Estudiante' : 'Administrador'}
              </h1>
              <div className="hidden md:flex space-x-4">
                <a href="#" className="nav-link">
                  Inicio
                </a>
                <span className="nav-link cursor-not-allowed opacity-50">
                  Calendario
                </span>
                <span className="nav-link cursor-not-allowed opacity-50">
                  Recursos
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-3 py-1 bg-gray-100 rounded-full">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white font-medium">
                    {session?.user?.name?.[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="text-gray-700">{session?.user?.name}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-primary bg-red-500 hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3zm7 4a1 1 0 0 1 1 1v4a1 1 0 1 1-2 0V8a1 1 0 0 1 1-1z" clipRule="evenodd"/>
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
} 