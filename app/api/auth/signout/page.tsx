'use client';

import { signOut } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function SignOutPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="login-container">
      <div className="login-card max-w-md w-full text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            <Image
              src="/judiciales.jpeg"
              alt="Judiciales Córdoba Logo"
              width={120}
              height={50}
              className="campus-logo"
              priority
            />
            <div className="h-12 w-px bg-gray-200" />
            <Image
              src="/asd.jpeg"
              alt="ASD Logo"
              width={120}
              height={50}
              className="campus-logo"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Cerrar Sesión
          </h1>
          <p className="text-gray-600">
            ¿Estás seguro que deseas cerrar la sesión?
          </p>
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleCancel}
            className="flex-1 btn-primary bg-gray-500 hover:bg-gray-600 justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span>Cancelar</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex-1 btn-primary bg-red-500 hover:bg-red-600 justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm7 4a1 1 0 011 1v4a1 1 0 11-2 0V8a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </div>
  );
} 