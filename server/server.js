import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

// Import database connection
import connectDB from './config/database.js';

// Import error handlers
import errorHandler, { setupUnhandledRejectionHandler, setupUncaughtExceptionHandler } from './middleware/errorHandler.js';

// Import cache middleware
import routeCache, { dataCache } from './middleware/cacheMiddleware.js';

// Import security middleware
import configureSecurityMiddleware from './middleware/securityMiddleware.js';

// Import routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import activityRoutes from './routes/activity.js';
import achievementRoutes from './routes/achievement.js';
import footprintRoutes from './routes/footprint.js';
import shopRoutes from './routes/shop.js';
import adviceRoutes from './routes/advice.js';
import feedbackRoutes from './routes/feedback.js';
import healthRoutes from './routes/health.js';

// Setup global error handlers
setupUnhandledRejectionHandler();
setupUncaughtExceptionHandler();

// Load environment variables
dotenv.config();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Connect to database
connectDB();

// 基础中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// 日志中间件
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS配置
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 允许无来源的请求（如移动端/服务器端请求）
    if (!origin) return callback(null, true);

    // 明确允许的来源
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // 允许所有 localhost/127.0.0.1 任意端口（便于开发）
    if (/^http:\/\/localhost:\d+$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) {
      return callback(null, true);
    }

    // 其他来源拒绝
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-xsrf-token']
}));

// 应用安全中间件
configureSecurityMiddleware(app);

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/activities', routeCache(60000), activityRoutes); // 缓存1分钟
app.use('/api/achievements', routeCache(300000), achievementRoutes); // 缓存5分钟
app.use('/api/footprint', routeCache(60000), footprintRoutes); // 缓存1分钟
app.use('/api/shop', routeCache(300000), shopRoutes); // 缓存5分钟
app.use('/api/advice', routeCache(600000), adviceRoutes); // 缓存10分钟
app.use('/api/feedback', feedbackRoutes);
app.use('/health', healthRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      error: 'Duplicate Error',
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;