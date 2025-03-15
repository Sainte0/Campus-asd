'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Si está cargando, no hacer nada
    if (status === 'loading') return;

    // Si no hay sesión
    if (!session) {
      // Solo redirigir al inicio si no estamos ya en la página principal
      if (pathname !== '/') {
        router.replace('/');
      }
      return;
    }

    // Si hay sesión, manejar las redirecciones según el rol
    const userRole = session.user?.role;

    if (userRole === 'admin') {
      // Si es admin en la página principal, llevarlo al dashboard
      if (pathname === '/') {
        router.replace('/admin/dashboard');
      }
      // Si es admin intentando acceder a rutas de estudiante, redirigir al dashboard
      else if (pathname.startsWith('/student')) {
        router.replace('/admin/dashboard');
      }
    } else if (userRole === 'student') {
      // Si es estudiante en la página principal, llevarlo a su dashboard
      if (pathname === '/') {
        router.replace('/student');
      }
      // Si es estudiante intentando acceder a rutas de admin, redirigir a su dashboard
      else if (pathname.startsWith('/admin')) {
        router.replace('/student');
      }
    }
  }, [session, status, pathname]);

  // Mostrar un loader mientras se verifica la sesión
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return <>{children}</>;
} 