const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

// Definir el esquema de Usuario
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'student'], default: 'student' },
  eventbriteId: { type: String, sparse: true },
  tempPassword: String,
  passwordChanged: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Crear el modelo
let User;
try {
  User = mongoose.model('User');
} catch {
  User = mongoose.model('User', UserSchema);
}

async function createTestStudent() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB');

    const testStudent = {
      name: 'Estudiante de Prueba',
      email: 'test@estudiante.com',
      password: await bcrypt.hash('test123', 10),
      role: 'student',
      eventbriteId: 'test-123',
      tempPassword: 'test123',
      passwordChanged: false
    };

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: testStudent.email });
    
    if (existingUser) {
      console.log('El estudiante de prueba ya existe. Actualizando datos...');
      Object.assign(existingUser, testStudent);
      await existingUser.save();
    } else {
      await User.create(testStudent);
      console.log('Estudiante de prueba creado');
    }

    console.log('Credenciales del estudiante de prueba:');
    console.log('Email:', testStudent.email);
    console.log('Contraseña:', 'test123');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestStudent(); 