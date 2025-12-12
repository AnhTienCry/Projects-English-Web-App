import mongoose from 'mongoose';

/**
 * Convert any ObjectId-like object to proper ObjectId string
 * Handles cases where _id might be a plain object with buffer property
 */
export function toObjectIdString(id: any): string {
  if (!id) return '';
  
  // If it's already a string, return it
  if (typeof id === 'string') return id;
  
  // If it's a proper ObjectId, convert to string
  if (mongoose.Types.ObjectId.isValid(id)) {
    return id.toString();
  }
  
  // If it's an object with buffer property (from lean queries)
  if (id && typeof id === 'object' && id.buffer && id.buffer.data) {
    try {
      const buffer = Buffer.from(id.buffer.data);
      return new mongoose.Types.ObjectId(buffer).toString();
    } catch (error) {
      console.error('Error converting ObjectId from buffer:', error);
      return '';
    }
  }
  
  // Fallback: try to convert to string
  try {
    return id.toString();
  } catch (error) {
    console.error('Error converting ObjectId:', error);
    return '';
  }
}

