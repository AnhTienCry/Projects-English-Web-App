import mongoose, { Schema, Document } from "mongoose";

export interface IConversationHistory extends Document {
  userId: mongoose.Types.ObjectId;
  transcript: string;
  aiResponse: string;
  audioUrl: string;
  createdAt: Date;
}

const ConversationHistorySchema = new Schema<IConversationHistory>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  transcript: { type: String, required: true },
  aiResponse: { type: String, required: true },
  audioUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ConversationHistory = mongoose.models.ConversationHistory || mongoose.model<IConversationHistory>(
  "ConversationHistory",
  ConversationHistorySchema
);
