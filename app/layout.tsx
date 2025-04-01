import './globals.css';
import { Inter } from 'next/font/google';
import { RootLayoutClient } from './components/RootLayoutClient';
import { Toaster } from 'react-hot-toast';
import { Analytics } from "@vercel/analytics/react"

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
      <head>
        <link rel="icon" href="/asd.jpeg" type="image/jpeg" />
      </head>
      <body className={inter.className}>
        <Toaster position="top-center" />
        <RootLayoutClient>{children}</RootLayoutClient>
      </body>
    </html>
  );
}
