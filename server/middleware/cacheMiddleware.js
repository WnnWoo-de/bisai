import { CacheService } from '../utils/cacheService.js';

// 创建缓存实例
const cache = new CacheService({
  maxSize: process.env.CACHE_MAX_SIZE || 1000,
  defaultTTL: process.env.CACHE_DEFAULT_TTL || 300000 // 5分钟
});

/**
 * 路由缓存中间件
 * @param {number} ttl - 缓存时间(毫秒)
 * @returns {Function} Express中间件
 */
export const routeCache = (ttl) => {
  return (req, res, next) => {
    // 跳过非GET请求的缓存
    if (req.method !== 'GET') {
      return next();
    }

    // 已认证用户不使用缓存
    if (req.user) {
      return next();
    }

    // 生成缓存键
    const key = `${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.send(cachedResponse);
    }

    // 保存原始send方法
    const originalSend = res.send;

    // 重写send方法以缓存响应
    res.send = function(body) {
      // 只缓存成功的响应
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, body, ttl);
      }
      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * 数据缓存服务
 * 提供给控制器使用的缓存服务
 */
export const dataCache = cache;

export default routeCache;