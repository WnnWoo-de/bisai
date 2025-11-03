import request from 'supertest';
import express from 'express';
import healthRoutes from '../routes/health.js';

// 创建测试应用
const app = express();
app.use('/health', healthRoutes);

describe('健康检查API测试', () => {
  test('基础健康检查应返回200状态码', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});