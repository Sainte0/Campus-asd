import './globals.css';
import { Inter } from 'next/font/google';
import { RootLayoutClient } from './components/RootLayoutClient';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Campus Virtual',
  description: 'Mini campus virtual para estudiantes y administradores',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
