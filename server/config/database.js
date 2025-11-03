import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建日志目录
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志写入流
const dbLogStream = fs.createWriteStream(
  path.join(logDir, `database-${new Date().toISOString().split('T')[0]}.log`),
  { flags: 'a' }
);

let sequelize;

const connectDB = async () => {
  // 如果是开发环境且没有配置MySQL连接信息，则跳过数据库连接
  if (process.env.NODE_ENV === 'development' && !process.env.DB_HOST) {
    console.log('🔧 Development mode: Running without MySQL connection');
    console.log('📝 Note: Database operations will use mock data');
    return null;
  }

  try {
    // 创建Sequelize实例
    sequelize = new Sequelize(
      process.env.DB_NAME || 'greenn_db',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || 'Wnn0705520@',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        dialectOptions: {
          charset: 'utf8mb4',
          collate: 'utf8mb4_unicode_ci',
          // 添加SSL支持（如果需要）
          ssl: process.env.DB_SSL === 'true' ? {
            require: true,
            rejectUnauthorized: false
          } : false,
          // 添加连接超时设置
          connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT) || 60000
        },
        pool: {
          max: parseInt(process.env.DB_POOL_MAX) || 10,
          min: parseInt(process.env.DB_POOL_MIN) || 0,
          acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
          idle: parseInt(process.env.DB_POOL_IDLE) || 10000
        },
        logging: process.env.NODE_ENV === 'development' 
          ? (msg) => {
              console.log(msg);
              dbLogStream.write(`${new Date().toISOString()} - ${msg}\n`);
            }
          : (msg) => dbLogStream.write(`${new Date().toISOString()} - ${msg}\n`),
        timezone: process.env.DB_TIMEZONE || '+08:00', // 设置时区
        retry: {
          max: 5, // 最大重试次数
          match: [/Deadlock/i, /Lock wait timeout/i] // 匹配需要重试的错误
        }
      }
    );

    // 测试连接
    await sequelize.authenticate();
    console.log(`✅ MySQL Connected: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    
    // 同步数据库表结构（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('📊 Database tables synchronized');
    }
     
    return sequelize;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    dbLogStream.write(`${new Date().toISOString()} - ERROR: ${error.message}\n`);
    
    // 如果是开发环境，则继续运行应用，否则退出进程
    if (process.env.NODE_ENV !== 'development') {
      console.error('🛑 Application terminated due to database connection failure');
      process.exit(1);
    } else {
      console.warn('⚠️ Development mode: Continuing without database connection');
      return null;
    }
  }
};

// 导出连接函数和Sequelize实例
export const getSequelize = () => sequelize;
export { sequelize };
export default connectDB;