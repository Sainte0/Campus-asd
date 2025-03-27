import mongoose, { Document, Model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'student' | 'admin';
  eventbriteId?: string;
  eventId: string;
  documento: string;
  commission?: string;
  status?: 'registered' | 'checked_in' | 'checked_out';
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
  eventId: {
    type: String,
    required: true,
  },
  documento: {
    type: String,
    required: true,
    unique: true,
  },
  commission: {
    type: String,
    sparse: true,
  },
  status: {
    type: String,
    enum: ['registered', 'checked_in', 'checked_out'],
    default: 'registered'
  }
}, {
  timestamps: true,
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', userSchema);

export default User; 