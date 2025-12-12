import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { updateMyProfile } from '../controllers/userController';
import User from '../models/User';
import { toObjectIdString } from '../utils/objectId';
import mongoose from 'mongoose';

const router = Router();

router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    console.log('🔍 Looking for user with ID:', userId);
    
    // Convert userId to ObjectId using buffer method
    let objectId;
    try {
      // First try direct conversion
      objectId = new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error('❌ Invalid ObjectId:', userId);
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Try to find user using different methods
    let user: any = null;
    
    // Method 1: Direct findById
    user = await User.findById(objectId).select('-passwordHash').lean();
    
    // Method 2: If not found, try with string
    if (!user) {
      user = await User.findOne({ _id: userId }).select('-passwordHash').lean();
    }
    
    // Method 3: If still not found, try with email (fallback)
    if (!user && req.user?.email) {
      user = await User.findOne({ email: req.user.email }).select('-passwordHash').lean();
    }
    
    console.log('👤 Found user:', !!user);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      id: toObjectIdString(user._id),
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/me', authenticate, updateMyProfile);

router.get('/admin-only', authenticate, requireRole('ADMIN'), (_req, res) => {
  res.json({ secret: 'admin data' });
});

export default router;