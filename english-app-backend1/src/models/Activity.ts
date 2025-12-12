import mongoose, { Document, Schema } from 'mongoose';

export interface IActivity extends Document {
  type: 'user_registered' | 'lesson_created' | 'lesson_published' | 'video_uploaded' | 'quiz_created' | 'user_updated' | 'video_deleted' | 'lesson_deleted';
  userId?: string;
  targetId?: string; // ID of the lesson/video/quiz that was created/updated
  targetType?: 'user' | 'lesson' | 'video' | 'quiz';
  description: string;
  metadata?: {
    email?: string;
    title?: string;
    level?: number;
    role?: string;
    [key: string]: any;
  };
  createdAt?: Date;
}

const ActivitySchema = new Schema<IActivity>({
  type: {
    type: String,
    required: true,
    enum: [
      'user_registered',
      'lesson_created',
      'lesson_published',
      'video_uploaded',
      'quiz_created',
      'user_updated',
      'video_deleted',
      'lesson_deleted'
    ]
  },
  userId: { type: String, ref: 'User' },
  targetId: { type: String },
  targetType: {
    type: String,
    enum: ['user', 'lesson', 'video', 'quiz']
  },
  description: { type: String, required: true },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

// Index for efficient queries
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ type: 1 });
ActivitySchema.index({ userId: 1 });

export default mongoose.models.Activity ||
  mongoose.model<IActivity>('Activity', ActivitySchema);

