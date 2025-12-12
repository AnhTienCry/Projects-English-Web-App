import mongoose, { Schema, Document } from 'mongoose';

export interface ILevel extends Document {
  number: number; // 1, 2, 3, 4, 5...
  name: string;
  description?: string;
  requiredLessonsToUnlock: number; // Số lesson phải hoàn thành để unlock level tiếp theo
  badge?: string; // Badge ID khi hoàn thành level
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const LevelSchema = new Schema<ILevel>({
  number: { 
    type: Number, 
    required: true, 
    unique: true
  },
  name: { type: String, required: true },
  description: { type: String },
  requiredLessonsToUnlock: { type: Number, default: 5 },
  badge: { 
    type: String, 
    ref: 'Badge' 
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Index for efficient queries (number already has unique index)
LevelSchema.index({ isActive: 1 });

// Update the updatedAt field before saving
LevelSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Level || mongoose.model<ILevel>('Level', LevelSchema);
