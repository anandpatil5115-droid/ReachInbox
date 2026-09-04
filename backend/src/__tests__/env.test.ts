import { env } from '../config/env';

describe('Environment Configuration', () => {
  it('should have required environment variables', () => {
    expect(env).toBeDefined();
    expect(env.PORT).toBeDefined();
    expect(env.DATABASE_URL).toBeDefined();
    expect(env.REDIS_URL).toBeDefined();
    expect(env.SESSION_SECRET).toBeDefined();
  });

  it('should have correct default values', () => {
    expect(env.PORT).toBe(3001);
    expect(['development', 'test']).toContain(env.NODE_ENV);
    expect(env.WORKER_CONCURRENCY).toBe(5);
    expect(env.MIN_SEND_DELAY_MS).toBe(2000);
    expect(env.MAX_EMAILS_PER_HOUR).toBe(200);
  });
});
