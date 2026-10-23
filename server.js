import path from 'path';
import http from 'http';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';

import { connectDB } from './backend/config/db.js';
import { notFound, errorHandler } from './backend/middleware/errorMiddleware.js';

import authRoutes from './backend/routes/authRoutes.js';
import clientRoutes from './backend/routes/clientRoutes.js';
import invoiceRoutes from './backend/routes/invoiceRoutes.js';
import expenseRoutes from './backend/routes/expenseRoutes.js';
import taxRoutes from './backend/routes/taxRoutes.js';
import aiRoutes from './backend/routes/aiRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO for real-time live events across devices
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

// Middleware to inject `io` instance into all request handlers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (receipts & company logos)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Mount API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/tax', taxRoutes);
app.use('/api/v1/ai', aiRoutes);

// System Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'TaxPulse Pro API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files
app.use(express.static(process.cwd()));

// SPA fallback for root / client routing
app.get('/', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Socket.IO Room Joining for Authenticated Users
io.on('connection', (socket) => {
  socket.on('join_user_room', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Clean socket disconnect
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n⚠️  [Port ${PORT} In Use]: Another instance of TaxPulse Pro or Node.js is already running on port ${PORT}.`);
    console.log(`👉 You can directly open http://localhost:${PORT} in your browser.`);
    console.log(`💡 To restart fresh, stop the existing process first (e.g., in PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force)\n`);
    process.exit(0);
  } else {
    console.error('Server error:', err.message);
  }
});

// Connect to MongoDB Atlas and start server
const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`🚀 [TaxPulse Pro Server Running]: http://localhost:${PORT}`);
      console.log(`📡 [Real-time WebSockets]: Active`);
      console.log(`📂 [Static & Uploads]: Ready`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
  }
};

startServer();
