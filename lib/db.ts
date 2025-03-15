import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('Por favor define MONGODB_URI en las variables de entorno');
}

const MONGODB_URI = process.env.MONGODB_URI;

const options = {
  bufferCommands: false,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

async function connectDB() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('Usando conexión existente a MongoDB');
      return mongoose.connection;
    }

    console.log('Estableciendo nueva conexión a MongoDB...');
    await mongoose.connect(MONGODB_URI, options);
    console.log('Conexión a MongoDB establecida exitosamente');
    return mongoose.connection;
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error);
    throw error;
  }
}

export default connectDB; 