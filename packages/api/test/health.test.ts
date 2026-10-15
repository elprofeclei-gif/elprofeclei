import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../src/app';

describe('Health Check', () => {
  it('should return 200 OK', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
  });
});
