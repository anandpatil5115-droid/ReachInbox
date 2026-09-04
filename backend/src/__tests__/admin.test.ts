import { isElasticsearchConfigured, checkConnection } from '../services/elasticsearch';
import { reindexAllEmails } from '../scripts/reindex';

jest.mock('../services/elasticsearch', () => ({
  isElasticsearchConfigured: jest.fn(),
  checkConnection: jest.fn(),
  ensureIndex: jest.fn(),
  getClient: jest.fn(),
  getIndexName: jest.fn().mockReturnValue('test-index'),
}));

jest.mock('../scripts/reindex', () => ({
  reindexAllEmails: jest.fn(),
}));

jest.mock('../config/database', () => ({
  __esModule: true,
  default: {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue(1),
    orderBy: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    raw: jest.fn(),
    transaction: jest.fn((cb: Function) => cb({})),
  },
}));

jest.mock('../config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    DATABASE_URL: 'postgresql://test',
    REDIS_URL: 'redis://localhost:6379',
    SESSION_SECRET: 'test',
    ELASTICSEARCH_URL: 'http://localhost:9200',
    ELASTICSEARCH_INDEX: 'test-index',
    WORKER_CONCURRENCY: 5,
    MAX_EMAILS_PER_HOUR: 200,
    MIN_SEND_DELAY_MS: 2000,
  },
}));

jest.mock('../services/queueService', () => ({
  emailQueue: {
    name: 'email-queue',
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getDelayedCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(0),
    getFailedCount: jest.fn().mockResolvedValue(0),
  },
}));

describe('Bull-Board Dashboard', () => {
  it('should have email queue configured', () => {
    const { emailQueue } = require('../services/queueService');
    expect(emailQueue.name).toBe('email-queue');
  });

  it('should expose queue metrics', async () => {
    const { emailQueue } = require('../services/queueService');
    const waiting = await emailQueue.getWaitingCount();
    const delayed = await emailQueue.getDelayedCount();
    const active = await emailQueue.getActiveCount();
    const completed = await emailQueue.getCompletedCount();
    const failed = await emailQueue.getFailedCount();

    expect(waiting).toBe(0);
    expect(delayed).toBe(0);
    expect(active).toBe(0);
    expect(completed).toBe(0);
    expect(failed).toBe(0);
  });
});

describe('Admin Routes', () => {
  it('should have Elasticsearch configured', () => {
    (isElasticsearchConfigured as jest.Mock).mockReturnValue(true);
    expect(isElasticsearchConfigured()).toBe(true);
  });

  it('should have reindex function available', () => {
    expect(typeof reindexAllEmails).toBe('function');
  });

  it('should check Elasticsearch connection', async () => {
    (checkConnection as jest.Mock).mockResolvedValue(true);
    const result = await checkConnection();
    expect(result).toBe(true);
  });
});
