import mongoose, { Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'admin';
  eventbriteId?: string;
  tempPassword?: string;
  passwordChanged: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false, // No incluir por defecto en las consultas
  },
  role: {
    type: String,
    enum: ['admin', 'student'],
    default: 'student',
  },
  eventbriteId: {
    type: String,
    sparse: true,
  },
  tempPassword: {
    type: String,
  },
  passwordChanged: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 