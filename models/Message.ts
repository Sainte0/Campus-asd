import mongoose, { Document, Model, Types } from 'mongoose';

export interface IMessage extends Document {
  sender: Types.ObjectId;
  content: string;
  timestamp: Date;
  isRead: boolean;
}

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>('Message', messageSchema);

export default Message; 