import Activity from '../models/Activity';

export const logActivityHelper = async (
  userId: string,
  activityType: string,
  relatedId?: string,
  metadata?: any
) => {
  try {
    await Activity.create({
      user: userId,
      activityType,
      relatedId,
      metadata
    });
  } catch (err) {
    console.error('Activity logging error:', err);
  }
};










