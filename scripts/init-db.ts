import bcrypt from 'bcryptjs';
import connectDB from '../lib/db';
import User from '../models/User';

async function initDB() {
  try {
    await connectDB();

    // Crear usuario administrador por defecto
    const adminPassword = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate(
      { email: 'admin@campus.com' },
      {
        email: 'admin@campus.com',
        password: adminPassword,
        name: 'Administrador',
        role: 'admin',
      },
      { upsert: true, new: true }
    );

    console.log('Base de datos inicializada correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

initDB(); 