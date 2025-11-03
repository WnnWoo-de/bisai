import { CacheService } from '../utils/cacheService.js';

describe('缓存服务测试', () => {
  let cache;
  
  beforeEach(() => {
    cache = new CacheService({ maxSize: 10, defaultTTL: 100 });
  });
  
  test('应该能设置和获取缓存项', () => {
    cache.set('test-key', 'test-value');
    expect(cache.get('test-key')).toBe('test-value');
  });
  
  test('过期的缓存项应返回null', async () => {
    cache.set('expire-key', 'expire-value', 10); // 10ms TTL
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(cache.get('expire-key')).toBeNull();
  });
});