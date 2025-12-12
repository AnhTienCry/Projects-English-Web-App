import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const rawUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/english-app';
const uri = rawUri.replace('localhost', '127.0.0.1');

export async function connectDB(): Promise<typeof mongoose> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  // an toàn: show redacted uri
  console.log('Using MONGO_URI:', (uri || '').replace(/\/\/.*@/, '//<REDACTED>@'));
  console.log('Connected to DB name:', mongoose.connection.name || (mongoose.connection.db && mongoose.connection.db.databaseName));
  return mongoose;
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}