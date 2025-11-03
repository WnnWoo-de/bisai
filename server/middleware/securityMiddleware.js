import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';

/**
 * 增强的安全中间件配置
 */
export const configureSecurityMiddleware = (app) => {
  // 设置安全HTTP头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
        connectSrc: ["'self'", "https://api.greenn.app"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // 防止点击劫持
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // 设置 CSRF 令牌（仅在缺失时设置，避免每次 GET 都刷新导致不一致）
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      const existingToken = req.cookies?.['XSRF-TOKEN'];
      if (!existingToken) {
        const csrfToken = randomBytes(16).toString('hex');
        res.cookie('XSRF-TOKEN', csrfToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          // 开发环境更宽松，生产环境使用 strict
          sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
          path: '/'
        });
        res.locals.csrfToken = csrfToken;
      }
    }
    next();
  });

  // 验证CSRF令牌
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const cookieToken = req.cookies['XSRF-TOKEN'];
      const headerToken = req.headers['x-xsrf-token'];
      
      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({ error: 'CSRF验证失败' });
      }
    }
    next();
  });

  // 限制请求速率
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 每个IP限制100个请求
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '请求过于频繁，请稍后再试' }
  });
  
  // 对API路由应用速率限制
  app.use('/api/', apiLimiter);
  
  // 对登录路由应用更严格的速率限制
  const loginLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 10, // 每个IP限制10次登录尝试
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: '登录尝试次数过多，请1小时后再试' }
  });
  
  app.use('/api/auth/login', loginLimiter);
  
  return app;
};

export default configureSecurityMiddleware;