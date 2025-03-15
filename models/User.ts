import mongoose from 'mongoose';

export interface IUser extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  eventbriteId?: string;
  tempPassword?: string;
  passwordChanged: boolean;
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

const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 