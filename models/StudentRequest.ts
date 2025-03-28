import mongoose from 'mongoose';

const studentRequestSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: [true, 'El nombre es requerido'],
  },
  apellido: {
    type: String,
    required: [true, 'El apellido es requerido'],
  },
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
  },
  documento: {
    type: String,
    required: [true, 'El documento es requerido'],
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const StudentRequest = mongoose.models.StudentRequest || mongoose.model('StudentRequest', studentRequestSchema);

export default StudentRequest; 