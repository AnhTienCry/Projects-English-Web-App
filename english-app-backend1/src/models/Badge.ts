import mongoose, { Schema, Document } from "mongoose";

export interface IBadge extends Document {
  name: string;
  condition?: string;
  icon?: string;
  users: mongoose.Types.ObjectId[];
}

const badgeSchema = new Schema<IBadge>({
  name: { type: String, required: true },
  condition: String,
  icon: String,
  users: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

export default mongoose.model<IBadge>("Badge", badgeSchema);
