#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

interface Command {
  name: string;
  description: string;
  command: string;
}

const commands: Command[] = [
  {
    name: 'check',
    description: 'Kiểm tra dữ liệu trong database',
    command: 'npm run check-db'
  },
  {
    name: 'export',
    description: 'Export toàn bộ dữ liệu database',
    command: 'npm run export-db'
  },
  {
    name: 'import',
    description: 'Import dữ liệu từ file export',
    command: 'npm run import-db'
  },
  {
    name: 'populate',
    description: 'Tạo dữ liệu mẫu cho database',
    command: 'npm run populate'
  }
];

function showHelp() {
  console.log('🗄️  Database Manager - Quản lý Database English App\n');
  console.log('Cách sử dụng:');
  console.log('  npx ts-node src/scripts/db-manager.ts <command> [options]\n');
  
  console.log('Các lệnh có sẵn:');
  commands.forEach(cmd => {
    console.log(`  ${cmd.name.padEnd(10)} - ${cmd.description}`);
  });
  
  console.log('\nVí dụ:');
  console.log('  npx ts-node src/scripts/db-manager.ts check');
  console.log('  npx ts-node src/scripts/db-manager.ts export');
  console.log('  npx ts-node src/scripts/db-manager.ts import exports/db-export-2025-10-18.json');
  console.log('  npx ts-node src/scripts/db-manager.ts populate');
  
  console.log('\n📁 Files được tạo:');
  console.log('  - exports/db-export-YYYY-MM-DD.json (file export)');
  console.log('  - exports/import-db-data.js (script import)');
  console.log('  - exports/README.md (hướng dẫn)');
  console.log('  - DATABASE_EXPORT_IMPORT_GUIDE.md (hướng dẫn chi tiết)');
}

function runCommand(commandName: string, args: string[] = []) {
  const command = commands.find(cmd => cmd.name === commandName);
  
  if (!command) {
    console.log(`❌ Lệnh không hợp lệ: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    console.log(`🚀 Đang chạy: ${command.description}...\n`);
    
    let fullCommand = command.command;
    if (args.length > 0) {
      fullCommand += ' ' + args.join(' ');
    }
    
    execSync(fullCommand, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    console.log(`\n✅ Hoàn thành: ${command.description}`);
    
  } catch (error) {
    console.error(`\n❌ Lỗi khi chạy lệnh: ${command.description}`);
    console.error(error);
    process.exit(1);
  }
}

function showStatus() {
  console.log('📊 Trạng thái Database Manager\n');
  
  // Check if exports directory exists
  const exportsDir = path.join(__dirname, '../../exports');
  if (fs.existsSync(exportsDir)) {
    const files = fs.readdirSync(exportsDir);
    console.log('📁 Thư mục exports:');
    files.forEach(file => {
      const filePath = path.join(exportsDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  - ${file} (${(stats.size / 1024).toFixed(2)} KB)`);
    });
  } else {
    console.log('📁 Thư mục exports: Chưa có');
  }
  
  // Check if guide exists
  const guidePath = path.join(__dirname, '../../DATABASE_EXPORT_IMPORT_GUIDE.md');
  if (fs.existsSync(guidePath)) {
    console.log('📖 Hướng dẫn: DATABASE_EXPORT_IMPORT_GUIDE.md');
  } else {
    console.log('📖 Hướng dẫn: Chưa có');
  }
  
  console.log('\n💡 Sử dụng "npx ts-node src/scripts/db-manager.ts help" để xem hướng dẫn');
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }
  
  if (args[0] === 'status') {
    showStatus();
    return;
  }
  
  const commandName = args[0];
  const commandArgs = args.slice(1);
  
  runCommand(commandName, commandArgs);
}

// Run the script
if (require.main === module) {
  main();
}













