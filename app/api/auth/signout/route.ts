import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Sesión cerrada exitosamente' });
}

export async function POST() {
  return NextResponse.json({ message: 'Sesión cerrada exitosamente' });
} 