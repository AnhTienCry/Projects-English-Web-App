import mongoose, { Schema, Document } from 'mongoose';

export interface IVocab extends Document {
  word: string;
  meaning: string;
  phonetic?: string; // IPA: /həˈləʊ/
  pronunciationUS?: string; // Audio URL or text guide
  pronunciationUK?: string; // Audio URL or text guide
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction' | 'pronoun' | 'interjection';
  stress?: string; // Syllable stress pattern: HEL-lo (1st syllable)
  example?: string;
  exampleTranslation?: string; // Vietnamese translation of example
  synonyms?: string[]; // Similar words
  antonyms?: string[]; // Opposite words
  lesson?: mongoose.Types.ObjectId;
  topic?: mongoose.Types.ObjectId;
  level?: string;
  imageUrl?: string; // Optional image for visual learning
  isActive?: boolean;
  createdBy?: mongoose.Types.ObjectId; // Teacher/Admin who created
  createdAt?: Date;
  updatedAt?: Date;
}

const VocabSchema = new Schema<IVocab>({
  word: { type: String, required: true, index: true },
  meaning: { type: String, required: true },
  phonetic: { type: String }, // /həˈləʊ/
  pronunciationUS: { type: String },
  pronunciationUK: { type: String },
  partOfSpeech: { 
    type: String, 
    enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'interjection']
  },
  stress: { type: String }, // HEL-lo
  example: { type: String },
  exampleTranslation: { type: String },
  synonyms: [{ type: String }],
  antonyms: [{ type: String }],
  lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  topic: { type: Schema.Types.ObjectId, ref: 'Topic' },
  level: { type: String, default: 'A1' },
  imageUrl: { type: String },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update timestamp on save
VocabSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Vocab || mongoose.model<IVocab>('Vocab', VocabSchema);