'use client';

import Image from 'next/image';

export function Footer() {
  return (
    <footer className="campus-footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <Image
              src="/judiciales.jpeg"
              alt="Judiciales Córdoba Logo"
              width={160}
              height={70}
              className="mb-4 brightness-200"
            />
            <p className="text-white/80 text-sm">
              Academia Santo Domingo - Judiciales Córdoba
              <br />
              Formando profesionales del futuro
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-white/80 hover:text-white transition">
                  Inicio
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition">
                  Calendario Académico
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition">
                  Recursos de Estudio
                </a>
              </li>
              <li>
                <a href="#" className="text-white/80 hover:text-white transition">
                  Soporte Técnico
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Contacto</h3>
            <ul className="space-y-2 text-white/80">
              <li className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                <span>contacto@asd.edu.ar</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Córdoba, Argentina</span>
              </li>
              <li className="flex items-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
                <span>+54 XXX-XXX-XXXX</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/60 text-sm">
          <p>© {new Date().getFullYear()} Academia Santo Domingo - Judiciales Córdoba. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
} 