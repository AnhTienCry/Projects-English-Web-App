import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role?: string;
  nickname?: string;
  avatarUrl?: string;
  createdAt?: Date;
  lastLogin?: Date;
}

const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEACHER', 'STUDENT'], default: 'STUDENT' },
  nickname: { type: String },
  avatarUrl: { type: String }, // Base64 encoded image or URL
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);