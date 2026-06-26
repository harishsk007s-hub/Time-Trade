import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import apiRouter from './routes/api';
import prisma from './config/db';

dotenv.config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-timetrade-key-2026';

const app = express();
const httpServer = createServer(app);

// Enable CORS
app.use(cors({
  origin: '*', // In production, restrict this to the frontend URL
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json());

// Attach routes
app.use('/api', apiRouter);

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Configure Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Store io instance on app for use in controllers
app.set('io', io);

// Track online users
const onlineUsers = new Set<string>();

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    (socket as any).userId = decoded.id;
    (socket as any).email = decoded.email;
    next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = (socket as any).userId;
  console.log(`User connected: ${userId} (Socket: ${socket.id})`);

  // Join personal room for live notifications
  socket.join(`user-${userId}`);
  
  // Track online status
  onlineUsers.add(userId);
  io.emit('online_users', Array.from(onlineUsers));

  // Join match chat room
  socket.on('join_match', async ({ matchId }) => {
    socket.join(`match-${matchId}`);
    console.log(`User ${userId} joined room match-${matchId}`);

    // Fetch and send message history
    try {
      const messages = await prisma.message.findMany({
        where: { matchId },
        include: {
          sender: { select: { id: true, name: true } }
        },
        orderBy: { createdAt: 'asc' }
      });
      socket.emit('message_history', messages);
    } catch (err) {
      console.error('Error fetching message history:', err);
    }
  });

  // Handle message sending
  socket.on('send_message', async ({ matchId, content }) => {
    if (!content || content.trim() === '') return;

    try {
      const message = await prisma.message.create({
        data: {
          matchId,
          senderId: userId,
          content,
        },
        include: {
          sender: { select: { id: true, name: true } }
        }
      });

      // Broadcast to everyone in the match room (including sender)
      io.to(`match-${matchId}`).emit('message_received', message);
    } catch (err) {
      console.error('Error saving message:', err);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Typing indicators
  socket.on('typing', ({ matchId, isTyping }) => {
    socket.to(`match-${matchId}`).emit('typing_status', {
      userId,
      isTyping,
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
    onlineUsers.delete(userId);
    io.emit('online_users', Array.from(onlineUsers));
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
