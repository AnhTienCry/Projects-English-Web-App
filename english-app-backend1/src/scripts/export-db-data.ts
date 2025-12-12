import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
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

interface ExportData {
  metadata: {
    exportDate: string;
    databaseName: string;
    version: string;
    totalRecords: number;
  };
  collections: {
    [key: string]: any[];
  };
}

async function exportDatabaseData() {
  try {
    console.log('🚀 Starting database export...\n');
    
    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Get database name
    const dbName = mongoose.connection.name || 'english-app';
    
    // Define collections to export
    const collections = [
      { name: 'users', model: User },
      { name: 'lessons', model: Lesson },
      { name: 'vocabulary', model: Vocab },
      { name: 'quizzes', model: Quiz },
      { name: 'videos', model: Video },
      { name: 'ranks', model: Rank },
      { name: 'badges', model: Badge },
      { name: 'userProgress', model: UserProgress },
      { name: 'lessonResults', model: LessonResult },
      { name: 'quizResults', model: QuizResult },
      { name: 'translations', model: Translation },
      { name: 'translationHistory', model: TranslationHistory },
      { name: 'notifications', model: Notification },
      { name: 'levels', model: Level }
    ];

    const exportData: ExportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        databaseName: dbName,
        version: '1.0.0',
        totalRecords: 0
      },
      collections: {}
    };

    let totalRecords = 0;

    console.log('📊 Exporting collections...\n');

    for (const collection of collections) {
      try {
        console.log(`📦 Exporting ${collection.name}...`);
        
        // Get all documents from collection
        const documents = await (collection.model as any).find({}).lean();
        const count = documents.length;
        
        exportData.collections[collection.name] = documents;
        totalRecords += count;
        
        console.log(`   ✅ Exported ${count} records from ${collection.name}`);
        
        // Show sample data for non-empty collections
        if (count > 0) {
          console.log(`   📋 Sample data preview:`);
          const sample = documents.slice(0, 1);
          console.log(`   ${JSON.stringify(sample, null, 2).substring(0, 200)}...`);
        }
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error exporting ${collection.name}:`, (error as Error).message);
        exportData.collections[collection.name] = [];
      }
    }

    // Update total records count
    exportData.metadata.totalRecords = totalRecords;

    // Create export directory if it doesn't exist
    const exportDir = path.join(__dirname, '../../exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `db-export-${timestamp}.json`;
    const filepath = path.join(exportDir, filename);

    // Write export data to file
    console.log('💾 Writing export data to file...');
    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Export completed successfully!`);
    console.log(`📁 Export file: ${filepath}`);
    console.log(`📊 Total records exported: ${totalRecords}`);
    
    // Show summary
    console.log('\n📈 Export Summary:');
    Object.entries(exportData.collections).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.length} records`);
    });

    // Create a simple import script
    const importScriptPath = path.join(exportDir, 'import-db-data.js');
    const importScript = `#!/usr/bin/env node

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import models (adjust paths as needed)
const User = require('../src/models/User');
const Lesson = require('../src/models/Lesson');
const Vocab = require('../src/models/Vocab');
const Quiz = require('../src/models/Quiz');
const Video = require('../src/models/Video');
const Rank = require('../src/models/Rank');
const Badge = require('../src/models/Badge');
const UserProgress = require('../src/models/UserProgress');
const LessonResult = require('../src/models/LessonResult');
const QuizResult = require('../src/models/QuizResult');
const Translation = require('../src/models/Translation');
const TranslationHistory = require('../src/models/TranslationHistory');
const Notification = require('../src/models/Notification');
const Level = require('../src/models/Level');

const models = {
  users: User,
  lessons: Lesson,
  vocabulary: Vocab,
  quizzes: Quiz,
  videos: Video,
  ranks: Rank,
  badges: Badge,
  userProgress: UserProgress,
  lessonResults: LessonResult,
  quizResults: QuizResult,
  translations: Translation,
  translationHistory: TranslationHistory,
  notifications: Notification,
  levels: Level
};

async function importDatabaseData(exportFile) {
  try {
    console.log('🚀 Starting database import...');
    
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/english-app';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Read export file
    console.log('📖 Reading export file...');
    const exportData = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
    
    console.log('📊 Import metadata:');
    console.log('  Export Date:', exportData.metadata.exportDate);
    console.log('  Database Name:', exportData.metadata.databaseName);
    console.log('  Total Records:', exportData.metadata.totalRecords);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    for (const [collectionName, model] of Object.entries(models)) {
      await model.deleteMany({});
      console.log('  ✅ Cleared', collectionName);
    }

    // Import data
    console.log('📦 Importing data...');
    let importedRecords = 0;
    
    for (const [collectionName, documents] of Object.entries(exportData.collections)) {
      if (documents.length > 0) {
        console.log('  📦 Importing', collectionName, '...');
        const model = models[collectionName];
        if (model) {
          await model.insertMany(documents);
          console.log('    ✅ Imported', documents.length, 'records');
          importedRecords += documents.length;
        } else {
          console.log('    ❌ Model not found for', collectionName);
        }
      }
    }

    console.log('✅ Import completed successfully!');
    console.log('📊 Total records imported:', importedRecords);

  } catch (error) {
    console.error('❌ Error importing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Get export file from command line argument
const exportFile = process.argv[2];
if (!exportFile) {
  console.error('❌ Please provide export file path');
  console.log('Usage: node import-db-data.js <export-file-path>');
  process.exit(1);
}

importDatabaseData(exportFile);
`;

    fs.writeFileSync(importScriptPath, importScript);
    console.log(`📝 Import script created: ${importScriptPath}`);

    // Create README for export
    const readmePath = path.join(exportDir, 'README.md');
    const readme = `# Database Export/Import

## Export Information
- **Export Date**: ${exportData.metadata.exportDate}
- **Database Name**: ${exportData.metadata.databaseName}
- **Total Records**: ${exportData.metadata.totalRecords}

## How to Import

### Method 1: Using the Import Script
\`\`\`bash
# Make sure you're in the project root directory
node exports/import-db-data.js exports/${filename}
\`\`\`

### Method 2: Manual Import
1. Make sure MongoDB is running
2. Update your \`.env\` file with the correct \`MONGO_URI\`
3. Run the import script

## Collections Exported
${Object.entries(exportData.collections).map(([name, data]) => `- **${name}**: ${data.length} records`).join('\n')}

## Notes
- This export includes all data from the database
- Make sure to backup your existing data before importing
- The import script will clear all existing data before importing
`;

    fs.writeFileSync(readmePath, readme);
    console.log(`📖 README created: ${readmePath}`);

  } catch (error) {
    console.error('❌ Error exporting database:', error);
  } finally {
    await disconnectDB();
    console.log('\n🔌 Disconnected from database');
  }
}

// Run the script
if (require.main === module) {
  exportDatabaseData();
}

export default exportDatabaseData;













