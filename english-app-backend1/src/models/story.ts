import mongoose, { Document, Schema } from 'mongoose';

// Interface này định nghĩa các thuộc tính của một document Story
export interface IStory extends Document {
  lesson?: mongoose.Schema.Types.ObjectId;
  topic?: mongoose.Schema.Types.ObjectId;
  content: string;
  selectedVocabIds: mongoose.Schema.Types.ObjectId[];
  // Bạn có thể thêm các trường khác như: title, author, v.v.
}

const StorySchema: Schema = new Schema(
  {
    lesson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson', // Tham chiếu đến model 'Lesson' của bạn
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic', // Tham chiếu đến model 'Topic'
    },
    content: {
      type: String,
      required: true,
    },
    selectedVocabIds: [{ // <-- THÊM KHỐI NÀY
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vocab', // Tham chiếu đến model Vocabulary của bạn
      default: [] // Mặc định là mảng rỗng
    }]
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

export default mongoose.model<IStory>('Story', StorySchema);




