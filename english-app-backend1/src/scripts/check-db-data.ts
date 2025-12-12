import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db';
import User from '../models/User';
import Lesson from '../models/Lesson';
import Vocab from '../models/Vocab';
import Quiz from '../models/Quiz';
import Video from '../models/Video';
import Rank from '../models/Rank';
import Badge from '../models/Badge';
import UserProgress from '../models/UserProgress';
import LessonResult from '../models/LessonResult';
import QuizResult from '../models/QuizResult';
import Translation from '../models/Translation';
import TranslationHistory from '../models/TranslationHistory';
import Notification from '../models/Notification';
import Level from '../models/Level';

async function checkDatabaseData() {
  try {
    console.log('🔍 Checking database data...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Check all collections
    const collections = [
      { name: 'Users', model: User },
      { name: 'Lessons', model: Lesson },
      { name: 'Vocabulary', model: Vocab },
      { name: 'Quizzes', model: Quiz },
      { name: 'Videos', model: Video },
      { name: 'Ranks', model: Rank },
      { name: 'Badges', model: Badge },
      { name: 'UserProgress', model: UserProgress },
      { name: 'LessonResults', model: LessonResult },
      { name: 'QuizResults', model: QuizResult },
      { name: 'Translations', model: Translation },
      { name: 'TranslationHistory', model: TranslationHistory },
      { name: 'Notifications', model: Notification },
      { name: 'Levels', model: Level }
    ];

    let totalRecords = 0;
    const collectionStats: { [key: string]: number } = {};

    for (const collection of collections) {
      try {
        const count = await collection.model.countDocuments();
        collectionStats[collection.name] = count;
        totalRecords += count;
        
        console.log(`📊 ${collection.name}: ${count} records`);
        
        // Show sample data for non-empty collections
        if (count > 0 && count <= 5) {
          const sampleData = await (collection.model as any).find().limit(3);
          console.log(`   Sample data:`, JSON.stringify(sampleData, null, 2));
        } else if (count > 5) {
          const sampleData = await (collection.model as any).find().limit(2);
          console.log(`   Sample data (first 2):`, JSON.stringify(sampleData, null, 2));
        }
        console.log('');
      } catch (error) {
        console.log(`❌ Error checking ${collection.name}:`, (error as Error).message);
        collectionStats[collection.name] = 0;
      }
    }

    console.log('📈 Summary:');
    console.log(`Total records across all collections: ${totalRecords}`);
    console.log('\nCollection breakdown:');
    Object.entries(collectionStats).forEach(([name, count]) => {
      console.log(`  ${name}: ${count}`);
    });

    // Check for specific important data
    console.log('\n🔍 Detailed Analysis:');
    
    // Check users
    const users = await User.find().select('email role nickname createdAt').lean();
    console.log('\n👥 Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.role}) - ${user.nickname || 'No nickname'}`);
    });

    // Check lessons
    const lessons = await Lesson.find().select('title level order isUnlocked isCompleted').lean();
    console.log('\n📚 Lessons:');
    lessons.forEach(lesson => {
      console.log(`  - ${lesson.title} (Level ${lesson.level}, Order ${lesson.order}) - ${lesson.isUnlocked ? 'Unlocked' : 'Locked'} - ${lesson.isCompleted ? 'Completed' : 'Not completed'}`);
    });

    // Check vocabulary
    const vocabCount = await Vocab.countDocuments();
    const vocabCategories = await Vocab.distinct('category');
    console.log(`\n📖 Vocabulary: ${vocabCount} words in categories: ${vocabCategories.join(', ')}`);

    // Check quizzes
    const quizCount = await Quiz.countDocuments();
    console.log(`\n🧩 Quizzes: ${quizCount} quizzes`);

    // Check videos
    const videoCount = await Video.countDocuments();
    console.log(`\n🎥 Videos: ${videoCount} videos`);

    // Check badges
    const badgeCount = await Badge.countDocuments();
    console.log(`\n🏆 Badges: ${badgeCount} badges`);

    // Check user progress
    const progressCount = await UserProgress.countDocuments();
    console.log(`\n📊 User Progress: ${progressCount} progress records`);

    // Check lesson results
    const lessonResultCount = await LessonResult.countDocuments();
    console.log(`\n📝 Lesson Results: ${lessonResultCount} lesson results`);

    // Check quiz results
    const quizResultCount = await QuizResult.countDocuments();
    console.log(`\n📝 Quiz Results: ${quizResultCount} quiz results`);

    // Check translations
    const translationCount = await Translation.countDocuments();
    console.log(`\n🌐 Translations: ${translationCount} translations`);

    // Check notifications
    const notificationCount = await Notification.countDocuments();
    console.log(`\n🔔 Notifications: ${notificationCount} notifications`);

    console.log('\n✅ Database check completed!');

  } catch (error) {
    console.error('❌ Error checking database:', error);
  } finally {
    await disconnectDB();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  checkDatabaseData();
}

export default checkDatabaseData;
