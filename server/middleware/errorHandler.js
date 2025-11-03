import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建错误日志写入流
const errorLogStream = fs.createWriteStream(
  path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

/**
 * 自定义API错误类
 */
export class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * 记录错误日志
 */
const logError = (err) => {
  const logEntry = `[${new Date().toISOString()}] ${err.name}: ${err.message}\nStack: ${err.stack}\n\n`;
  errorLogStream.write(logEntry);
  
  if (process.env.NODE_ENV === 'development') {
    console.error('❌ ERROR:', err);
  }
};

/**
 * 处理操作型错误
 */
const handleOperationalError = (err, req, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

/**
 * 处理编程型错误
 */
const handleProgrammerError = (err, req, res) => {
  // 在生产环境中隐藏错误详情
  const message = process.env.NODE_ENV === 'production' 
    ? '服务器内部错误' 
    : err.message;
  
  res.status(500).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = (err, req, res, next) => {
  // 记录所有错误
  logError(err);
  
  // 根据错误类型处理响应
  if (err instanceof ApiError && err.isOperational) {
    handleOperationalError(err, req, res);
  } else {
    handleProgrammerError(err, req, res);
  }
};

/**
 * 捕获未处理的Promise拒绝
 */
export const setupUnhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    logError(new Error(`Unhandled Rejection: ${reason}`));
    
    // 在开发环境中不退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
};

/**
 * 捕获未捕获的异常
 */
export const setupUncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    logError(err);
    
    // 在开发环境中不退出进程
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
};

export default errorHandler;