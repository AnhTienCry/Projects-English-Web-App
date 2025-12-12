import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Activity from '../models/Activity';
import { toObjectIdString } from '../utils/objectId';
import mongoose from 'mongoose';

/**
 * 📝 Log Activity
 * POST /api/activities
 */
export const logActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { type, targetId, targetType, description, metadata } = req.body;
    const userId = req.user?.sub;

    if (!type || !description) {
      return res.status(400).json({ 
        message: 'Missing required fields: type, description' 
      });
    }

    const activity = await Activity.create({
      type,
      userId,
      targetId,
      targetType,
      description,
      metadata,
      createdAt: new Date()
    });

    return res.status(201).json({
      message: 'Activity logged successfully',
      activity
    });
  } catch (err) {
    console.error('logActivity error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get Dashboard Stats (Admin)
 * GET /api/activities/dashboard-stats
 */
export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    const User = require('../models/User').default;
    const Lesson = require('../models/Lesson').default;
    const Quiz = require('../models/Quiz').default;
    const Video = require('../models/Video').default;

    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalLessons,
      totalQuizzes,
      totalVideos
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'TEACHER' }),
      User.countDocuments({ role: 'STUDENT' }),
      Lesson.countDocuments(),
      Quiz.countDocuments(),
      Video.countDocuments()
    ]);

    return res.json({
      users: {
        total: totalUsers,
        teachers: totalTeachers,
        students: totalStudents,
        growth: 0 // Can calculate based on time range
      },
      lessons: {
        total: totalLessons,
        growth: 0
      },
      quizzes: {
        total: totalQuizzes,
        growth: 0
      },
      videos: {
        total: totalVideos,
        growth: 0
      }
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📋 Get Recent Activities (Admin)
 * GET /api/activities/recent
 */
export const getRecentActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 10 } = req.query;
    
    const activities = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    // Get user info for each activity
    const User = require('../models/User').default;
    const activitiesWithUser = await Promise.all(
      activities.map(async (activity: any) => {
        if (activity.userId) {
          let user = null;
          try {
            // Try different methods to find user
            user = await User.findById(activity.userId).select('email nickname').lean();
            if (!user) {
              user = await User.findOne({ _id: activity.userId }).select('email nickname').lean();
            }
          } catch (error) {
            console.error('Error finding user for activity:', error);
          }
          
          return {
            id: toObjectIdString(activity._id),
            type: activity.type,
            title: activity.description || activity.type,
            description: activity.description,
            time: activity.createdAt,
            user: user || null
          };
        }
        return {
          id: toObjectIdString(activity._id),
          type: activity.type,
          title: activity.description || activity.type,
          description: activity.description,
          time: activity.createdAt,
          user: null
        };
      })
    );

    return res.json(activitiesWithUser);
  } catch (err) {
    console.error('getRecentActivities error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📊 Get Activities (with filters)
 * GET /api/activities
 */
export const getActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { 
      type, 
      userId, 
      targetType,
      page = 1, 
      limit = 50,
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const filter: any = {};
    if (type) filter.type = type;
    if (userId) filter.userId = userId;
    if (targetType) filter.targetType = targetType;

    const sortOrder = order === 'asc' ? 1 : -1;
    const sortField: any = {};
    sortField[sortBy as string] = sortOrder;

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Activity.find(filter)
        .sort(sortField)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments(filter)
    ]);

    // Get user info for each activity
    const User = require('../models/User').default;
    const activitiesWithUser = await Promise.all(
      activities.map(async (activity) => {
        if (activity.userId) {
          const user = await User.findById(activity.userId).select('email nickname').lean();
          return {
            ...activity,
            user: user || null
          };
        }
        return activity;
      })
    );

    return res.json({
      activities: activitiesWithUser,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('getActivities error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 📈 Get Activity Stats
 * GET /api/activities/stats
 */
export const getActivityStats = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const filter: any = {};
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const [total, byType, byUser] = await Promise.all([
      Activity.countDocuments(filter),
      Activity.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Activity.aggregate([
        { $match: { ...filter, userId: { $exists: true, $ne: null } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    // Get user details for top users
    const User = require('../models/User').default;
    const topUsersWithDetails = await Promise.all(
      byUser.map(async (item) => {
        const user = await User.findById(item._id).select('email nickname').lean();
        return {
          userId: item._id,
          count: item.count,
          user: user || { email: 'Unknown', nickname: 'Unknown' }
        };
      })
    );

    return res.json({
      total,
      byType: byType.map(item => ({
        type: item._id,
        count: item.count
      })),
      topUsers: topUsersWithDetails
    });
  } catch (err) {
    console.error('getActivityStats error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 👤 Get User Activities
 * GET /api/activities/user/:userId
 */
export const getUserActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [activities, total] = await Promise.all([
      Activity.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Activity.countDocuments({ userId })
    ]);

    return res.json({
      userId,
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (err) {
    console.error('getUserActivities error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 🗑️ Delete Activity (Admin only)
 * DELETE /api/activities/:activityId
 */
export const deleteActivity = async (req: AuthRequest, res: Response) => {
  try {
    const { activityId } = req.params;

    const activity = await Activity.findByIdAndDelete(activityId);
    
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }

    return res.json({ message: 'Activity deleted successfully' });
  } catch (err) {
    console.error('deleteActivity error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};

/**
 * 🧹 Clean old activities (Admin only)
 * DELETE /api/activities/clean
 */
export const cleanOldActivities = async (req: AuthRequest, res: Response) => {
  try {
    const { daysOld = 90 } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(daysOld));

    const result = await Activity.deleteMany({
      createdAt: { $lt: cutoffDate }
    });

    return res.json({
      message: `Cleaned activities older than ${daysOld} days`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error('cleanOldActivities error:', err);
    return res.status(500).json({ message: 'Server error', error: err });
  }
};