import mongoose from 'mongoose';

declare global {
  var mongoose: { conn: any; promise: any } | undefined
}

if (!process.env.MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env');
}

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  try {
    if (cached.conn) {
      return cached.conn;
    }

    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      keepAlive: true,
      keepAliveInitialDelay: 300000
    };

    if (!cached.promise) {
      mongoose.set('strictQuery', true);
      cached.promise = mongoose.connect(MONGODB_URI, opts);
    }

    cached.conn = await cached.promise;
    console.log('MongoDB connected successfully');
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    console.error('Error connecting to MongoDB:', e);
    throw e;
  }
}

export default connectDB; 