 // src/server.js
// This is the entry point of your entire backend.
// Think of it as the front door of your building.

const { syncDB } = require('./models/index');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const { connectDB } = require('./config/db');

// Create the express app
const app = express();

// Create HTTP server (needed for Socket.io to work alongside Express)
const httpServer = createServer(app);

// Set up Socket.io for real-time chat
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  }
});

// --- MIDDLEWARE ---
// These run on EVERY request before it reaches your routes

// Security headers
app.use(helmet());

// Allow requests from your web and mobile apps
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Parse incoming JSON data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting — max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api', limiter);

// --- HEALTH CHECK ROUTE ---
// Visit http://localhost:5000/health to confirm server is running
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'JobsLink API is running',
    timestamp: new Date().toISOString()
  });
});

// --- ROUTES (we add these in the next phases) ---
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/jobs', require('./routes/jobs.routes'));
app.use('/api/bids', require('./routes/bids.routes'));
app.use('/api/chat', require('./routes/chat.routes'));
app.use('/api/wallet', require('./routes/wallet.routes'));
app.use('/api/ratings', require('./routes/ratings.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'))
// app.use('/api/payments', require('./routes/payments.routes'));

// Socket.io — real time chat
// Each job has its own chat room identified by jobId
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins a job chat room
  socket.on('join_room', (jobId) => {
    socket.join(jobId);
    console.log(`User joined room: ${jobId}`);
  });

  // User sends a message
  socket.on('send_message', (data) => {
    // Broadcast message to everyone in the job room
    io.to(data.jobId).emit('receive_message', data);
  });

  // User is typing indicator
  socket.on('typing', (data) => {
    socket.to(data.jobId).emit('user_typing', {
      userId: data.userId,
      name: data.name
    });
  });

  // User stopped typing
  socket.on('stop_typing', (data) => {
    socket.to(data.jobId).emit('user_stop_typing', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// --- START SERVER ---
connectDB();
syncDB();
const PORT = process.env.PORT || 5000;

// Global error handler — catches any unhandled errors
// so the server never crashes completely
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message)
  console.error('Server will continue running...')
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise)
  console.error('Reason:', reason)
  console.error('Server will continue running...')
})

// Catch any Express errors and return clean response
// instead of crashing the server
app.use((err, req, res, next) => {
  console.error('Express error:', err.message)
  return res.status(500).json({
    success: false,
    message: 'Something went wrong on the server. Please try again.'
  })
})

httpServer.listen(PORT, () => {
  console.log(`JobsLink server running on port ${PORT}`);
});
