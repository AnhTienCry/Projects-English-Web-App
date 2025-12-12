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

async function importDatabaseData(exportFilePath: string, clearExisting: boolean = true) {
  try {
    console.log('🚀 Starting database import...\n');
    
    // Check if export file exists
    if (!fs.existsSync(exportFilePath)) {
      throw new Error(`Export file not found: ${exportFilePath}`);
    }

    // Connect to database
    await connectDB();
    console.log('✅ Connected to database\n');

    // Read export file
    console.log('📖 Reading export file...');
    const exportData: ExportData = JSON.parse(fs.readFileSync(exportFilePath, 'utf8'));
    
    console.log('📊 Import metadata:');
    console.log(`  Export Date: ${exportData.metadata.exportDate}`);
    console.log(`  Database Name: ${exportData.metadata.databaseName}`);
    console.log(`  Total Records: ${exportData.metadata.totalRecords}`);
    console.log('');

    // Define models mapping
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

    // Clear existing data if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing data...');
      for (const [collectionName, model] of Object.entries(models)) {
        try {
          const count = await (model as any).countDocuments();
          if (count > 0) {
            await (model as any).deleteMany({});
            console.log(`  ✅ Cleared ${count} records from ${collectionName}`);
          } else {
            console.log(`  ℹ️  ${collectionName} is already empty`);
          }
        } catch (error) {
          console.log(`  ❌ Error clearing ${collectionName}:`, (error as Error).message);
        }
      }
      console.log('');
    }

    // Import data
    console.log('📦 Importing data...');
    let importedRecords = 0;
    const importResults: { [key: string]: number } = {};
    
    for (const [collectionName, documents] of Object.entries(exportData.collections)) {
      if (documents.length > 0) {
        console.log(`  📦 Importing ${collectionName}...`);
        const model = models[collectionName as keyof typeof models];
        
        if (model) {
          try {
            // Remove _id fields to avoid conflicts
            const documentsToImport = documents.map(doc => {
              const { _id, __v, ...docWithoutId } = doc;
              return docWithoutId;
            });

            await (model as any).insertMany(documentsToImport);
            console.log(`    ✅ Imported ${documents.length} records`);
            importedRecords += documents.length;
            importResults[collectionName] = documents.length;
          } catch (error) {
            console.log(`    ❌ Error importing ${collectionName}:`, (error as Error).message);
            importResults[collectionName] = 0;
          }
        } else {
          console.log(`    ❌ Model not found for ${collectionName}`);
          importResults[collectionName] = 0;
        }
      } else {
        console.log(`  ℹ️  ${collectionName} is empty, skipping...`);
        importResults[collectionName] = 0;
      }
    }

    console.log('\n✅ Import completed successfully!');
    console.log(`📊 Total records imported: ${importedRecords}`);
    
    // Show detailed results
    console.log('\n📈 Import Results:');
    Object.entries(importResults).forEach(([name, count]) => {
      console.log(`  ${name}: ${count} records`);
    });

    // Verify import
    console.log('\n🔍 Verifying import...');
    let totalCurrentRecords = 0;
    for (const [collectionName, model] of Object.entries(models)) {
      try {
        const count = await (model as any).countDocuments();
        totalCurrentRecords += count;
        console.log(`  ${collectionName}: ${count} records`);
      } catch (error) {
        console.log(`  ❌ Error verifying ${collectionName}:`, (error as Error).message);
      }
    }
    
    console.log(`\n📊 Total records in database: ${totalCurrentRecords}`);

  } catch (error) {
    console.error('❌ Error importing database:', error);
    throw error;
  } finally {
    await disconnectDB();
    console.log('\n🔌 Disconnected from database');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Please provide export file path');
    console.log('Usage: npx ts-node src/scripts/import-db-data.ts <export-file-path> [--keep-existing]');
    console.log('');
    console.log('Options:');
    console.log('  --keep-existing    Keep existing data instead of clearing it first');
    process.exit(1);
  }

  const exportFilePath = args[0];
  const keepExisting = args.includes('--keep-existing');
  
  try {
    await importDatabaseData(exportFilePath, !keepExisting);
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

export default importDatabaseData;













