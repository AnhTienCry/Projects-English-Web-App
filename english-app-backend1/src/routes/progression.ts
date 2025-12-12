import express from 'express';
import {
  initializeUserProgress,
  getUserProgression,
  getLeaderboard,
  updateUserStreak,
  updateActivity,
  getGamificationInfo,
  unlockNextLesson,
  completeTopic,
  completeLesson,
  getTopicStatusByLesson,
  getActivityHistory,
} from '../controllers/progressionController';
import { authenticate } from '../middleware/auth';

const router = express.Router();


router.get("/topic-status/:lessonId", authenticate, getTopicStatusByLesson);
router.post('/initialize', authenticate, initializeUserProgress);
router.get('/me', authenticate, getUserProgression);
router.get('/leaderboard', getLeaderboard);
router.post('/update-streak', authenticate, updateUserStreak);
router.post('/update-activity', authenticate, updateActivity);
router.get('/gamification', authenticate, getGamificationInfo);
router.post('/unlock-lesson', authenticate, unlockNextLesson);
router.post('/complete-topic', authenticate, completeTopic);
router.post('/complete-lesson', authenticate, completeLesson);
router.get('/activity-history', authenticate, getActivityHistory);

export default router;
