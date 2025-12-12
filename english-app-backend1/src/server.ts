import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { connectDB, disconnectDB } from './config/db';
import { initVoiceSocket } from './socket/socketVoiceController';

const port = parseInt(process.env.PORT || '4000', 10);
const host = process.env.HOST || '0.0.0.0';

async function start() {
  try {
    await connectDB();
    console.log('✅ Backend connected to MongoDB and ready');
  } catch (err) {
    console.error('Failed to start: cannot connect to DB. Exiting.');
    process.exit(1);
  }

  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Create HTTP server
  const server = createServer(app);
  
  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*", // Allow all origins for development
      methods: ["GET", "POST"]
    }
  });

  // Make io available to routes
  app.set('io', io);

  // Initialize voice socket controller
  initVoiceSocket(io);

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // Handle user joining their room
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`👤 User ${userId} joined room`);
    });

    // Handle user leaving their room
    socket.on('leave', (userId) => {
      socket.leave(userId);
      console.log(`👤 User ${userId} left room`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  server.listen(port, host, () => {
    console.log(`🚀 API listening on http://${host}:${port}`);
    console.log(`🔌 Socket.io server ready`);
  });

  const shutdown = async (signal?: string) => {
    console.log(`Shutting down${signal ? ` (${signal})` : ''}...`);
    server.close(async () => {
      await disconnectDB();
      console.log('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forcing shutdown');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Log error nhưng không shutdown server ngay lập tức
    // Chỉ shutdown nếu là lỗi nghiêm trọng
    if (reason instanceof Error && reason.message?.includes('Cannot find module')) {
      console.error('Critical error, shutting down...');
      shutdown('unhandledRejection');
    } else {
      console.error('Non-critical unhandled rejection, continuing...');
    }
  });
}

start().catch(err => {
  console.error('Unhandled start error', err);
  process.exit(1);
});
