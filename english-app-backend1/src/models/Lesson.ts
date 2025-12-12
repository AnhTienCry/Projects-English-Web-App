import mongoose, { Schema, Document } from 'mongoose';

// Interfaces for lesson components
export interface IHighlightedWord {
  word: string;
  startIndex: number;
  endIndex: number;
  contextTranslation: string;
  wordType: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction';
  phonetic?: string;
  examples?: string[];
}

export interface IReadingComponent {
  content: string;
  highlightedWords: IHighlightedWord[];
  contextualTranslationEnabled: boolean;
  manualTranslationEnabled: boolean;
}

export interface IListeningQuestion {
  type: 'multiple_choice' | 'fill_blank' | 'true_false' | 'word_recognition';
  question: string;
  audioSegment?: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IListeningComponent {
  audioUrl: string;
  exerciseType: 'word_recognition' | 'sentence_completion' | 'dialogue_understanding' | 'pronunciation_practice';
  questions: IListeningQuestion[];
}

export interface IQuizQuestion {
  type: 'multiple_choice' | 'fill_in_blank';
  question: string;
  context?: string;
  options?: string[];
  correctAnswer: string;
  alternatives?: string[];
  explanation: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface IQuizComponent {
  questions: IQuizQuestion[];
  passingScore: number;
  timeLimit?: number;
}

export interface ILesson extends Document {
  title: string;
  description?: string;
  level: number; // 1, 2, 3, 4, 5...
  order: number; // Thứ tự trong level
  isUnlocked: boolean;
  isCompleted: boolean;
  isPublished: boolean; // ✅ thêm dòng này
  components: {
    reading: IReadingComponent;
    listening: IListeningComponent;
    quiz: IQuizComponent;
  };
  requiredScore: number; // Điểm tối thiểu để pass (ví dụ: 80%)
  unlockNextLesson: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}


const HighlightedWordSchema = new Schema<IHighlightedWord>({
  word: { type: String, required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true },
  contextTranslation: { type: String, required: true },
  wordType: { 
    type: String, 
    enum: ['noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction'],
    required: true 
  },
  phonetic: { type: String },
  examples: [{ type: String }]
});

const ReadingComponentSchema = new Schema<IReadingComponent>({
  content: { type: String, required: true },
  highlightedWords: [HighlightedWordSchema],
  contextualTranslationEnabled: { type: Boolean, default: true },
  manualTranslationEnabled: { type: Boolean, default: true }
});

const ListeningQuestionSchema = new Schema<IListeningQuestion>({
  type: { 
    type: String, 
    enum: ['multiple_choice', 'fill_blank', 'true_false', 'word_recognition'],
    required: true 
  },
  question: { type: String, required: true },
  audioSegment: { type: String },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    default: 'medium' 
  }
});

const ListeningComponentSchema = new Schema<IListeningComponent>({
  audioUrl: { type: String, default: '' },
  exerciseType: { 
    type: String, 
    enum: ['word_recognition', 'sentence_completion', 'dialogue_understanding', 'pronunciation_practice'],
    default: 'word_recognition'
  },
  questions: [ListeningQuestionSchema]
});

const QuizQuestionSchema = new Schema<IQuizQuestion>({
  type: { 
    type: String, 
    enum: ['multiple_choice', 'fill_in_blank'],
    required: true 
  },
  question: { type: String, required: true },
  context: { type: String },
  options: [{ type: String }],
  correctAnswer: { type: String, required: true },
  alternatives: [{ type: String }],
  explanation: { type: String, required: true },
  hint: { type: String },
  difficulty: { 
    type: String, 
    enum: ['easy', 'medium', 'hard'],
    default: 'medium' 
  }
});

const QuizComponentSchema = new Schema<IQuizComponent>({
  questions: [QuizQuestionSchema],
  passingScore: { type: Number, default: 80 },
  timeLimit: { type: Number } // in minutes
});

const LessonSchema = new Schema<ILesson>({
  title: { type: String, required: true },
  description: { type: String },
  level: { type: Number, required: true },
  order: { type: Number, required: true },
  components: {
    reading: ReadingComponentSchema,
    listening: ListeningComponentSchema,
    quiz: QuizComponentSchema
  },
  requiredScore: { type: Number, default: 80 },
  isUnlocked: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  unlockNextLesson: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});


// Index for efficient queries
LessonSchema.index({ level: 1, order: 1 });
LessonSchema.index({ isUnlocked: 1, isCompleted: 1 });

// Update the updatedAt field before saving
LessonSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', LessonSchema);