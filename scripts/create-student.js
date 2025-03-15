const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
  },
  name: {
    type: String,
    required: [true, 'Please provide a name'],
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
}, {
  timestamps: true,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Crear usuario estudiante de prueba
    const studentPassword = await bcrypt.hash('student123', 10);
    await User.findOneAndUpdate(
      { email: 'student@campus.com' },
      {
        email: 'student@campus.com',
        password: studentPassword,
        name: 'Estudiante de Prueba',
        role: 'student',
      },
      { upsert: true, new: true }
    );

    console.log('Estudiante creado correctamente');
    process.exit(0);
  } catch (error) {
    console.error('Error al crear el estudiante:', error);
    process.exit(1);
  }
}

createStudent(); 