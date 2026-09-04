import {
  isElasticsearchConfigured,
  getClient,
  getIndexName,
  checkConnection,
  EMAIL_INDEX_MAPPING,
  ensureIndex,
} from '../services/elasticsearch';
import {
  indexEmail,
  updateEmailIndex,
  bulkIndexEmails,
  searchEmails,
} from '../services/emailIndexer';

const mockIndex = jest.fn();
const mockUpdate = jest.fn();
const mockBulk = jest.fn();
const mockSearch = jest.fn();
const mockPing = jest.fn();
const mockIndicesExists = jest.fn();
const mockIndicesCreate = jest.fn();

jest.mock('@elastic/elasticsearch', () => ({
  Client: jest.fn().mockImplementation(() => ({
    index: mockIndex,
    update: mockUpdate,
    bulk: mockBulk,
    search: mockSearch,
    ping: mockPing,
    indices: {
      exists: mockIndicesExists,
      create: mockIndicesCreate,
    },
  })),
}));

jest.mock('../config/env', () => ({
  env: {
    ELASTICSEARCH_URL: 'http://localhost:9200',
    ELASTICSEARCH_INDEX: 'test-emails',
  },
}));

describe('Elasticsearch Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should report as configured when URL is set', () => {
    const result = isElasticsearchConfigured();
    expect(result).toBe(true);
  });

  it('should return the configured index name', () => {
    const name = getIndexName();
    expect(name).toBe('test-emails');
  });

  it('should return a client instance', () => {
    const client = getClient();
    expect(client).not.toBeNull();
  });

  it('should define proper index mappings', () => {
    expect(EMAIL_INDEX_MAPPING.mappings.properties.id.type).toBe('keyword');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.userId.type).toBe('keyword');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.recipient.type).toBe('text');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.subject.type).toBe('text');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.status.type).toBe('keyword');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.scheduledAt.type).toBe('date');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.sentAt.type).toBe('date');
    expect(EMAIL_INDEX_MAPPING.mappings.properties.createdAt.type).toBe('date');
  });

  it('should check connection via ping', async () => {
    mockPing.mockResolvedValue(true);
    const result = await checkConnection();
    expect(result).toBe(true);
    expect(mockPing).toHaveBeenCalled();
  });

  it('should handle ping failure gracefully', async () => {
    mockPing.mockRejectedValue(new Error('Connection refused'));
    const result = await checkConnection();
    expect(result).toBe(false);
  });

  it('should create index when it does not exist', async () => {
    mockIndicesExists.mockResolvedValue(false);
    mockIndicesCreate.mockResolvedValue({ acknowledged: true });
    await ensureIndex();
    expect(mockIndicesCreate).toHaveBeenCalled();
  });

  it('should not create index when it already exists', async () => {
    mockIndicesExists.mockResolvedValue(true);
    await ensureIndex();
    expect(mockIndicesCreate).not.toHaveBeenCalled();
  });
});

describe('Email Indexer', () => {
  const testDoc = {
    id: 'test-id-1',
    userId: 'user-1',
    campaignId: 'campaign-1',
    recipient: 'alice@example.com',
    subject: 'Test Subject',
    body: 'Hello Alice',
    senderEmail: 'sender@test.com',
    status: 'pending',
    scheduledAt: new Date().toISOString(),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should index an email document', async () => {
    mockIndex.mockResolvedValue({ _id: 'test-id-1' });
    await indexEmail(testDoc);
    expect(mockIndex).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'test-emails',
        id: 'test-id-1',
      })
    );
  });

  it('should use deterministic document IDs based on email ID', async () => {
    mockIndex.mockResolvedValue({ _id: testDoc.id });
    await indexEmail(testDoc);
    const callArgs = mockIndex.mock.calls[0][0];
    expect(callArgs.id).toBe(testDoc.id);
  });

  it('should handle index errors gracefully', async () => {
    mockIndex.mockRejectedValue(new Error('Index error'));
    await expect(indexEmail(testDoc)).resolves.not.toThrow();
  });

  it('should update email index', async () => {
    mockUpdate.mockResolvedValue({ _id: 'test-id-1' });
    await updateEmailIndex('test-id-1', { status: 'sent', sentAt: new Date() });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'test-emails',
        id: 'test-id-1',
      })
    );
  });

  it('should handle bulk indexing', async () => {
    mockBulk.mockResolvedValue({ errors: false });
    const docs = [testDoc, { ...testDoc, id: 'test-id-2', recipient: 'bob@example.com' }];
    const result = await bulkIndexEmails(docs);
    expect(result.indexed).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle bulk indexing errors', async () => {
    mockBulk.mockResolvedValue({
      errors: true,
      items: [
        { index: { _id: 'test-id-1', error: { type: '冲突' } } },
        { index: { _id: 'test-id-2' } },
      ],
    });
    const docs = [testDoc, { ...testDoc, id: 'test-id-2' }];
    const result = await bulkIndexEmails(docs);
    expect(result.indexed).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should search emails with user filtering', async () => {
    mockSearch.mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: testDoc, _score: 1.0 }],
      },
    });

    const result = await searchEmails({ userId: 'user-1', query: 'alice' });
    expect(result).not.toBeNull();
    expect(result!.emails).toHaveLength(1);
    expect(result!.searchProvider).toBe('elasticsearch');

    const searchCall = mockSearch.mock.calls[0][0];
    const query = searchCall.body.query.bool.must;
    expect(query).toContainEqual(expect.objectContaining({ term: { userId: 'user-1' } }));
  });

  it('should search by status', async () => {
    mockSearch.mockResolvedValue({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });

    await searchEmails({ userId: 'user-1', status: 'sent' });
    const searchCall = mockSearch.mock.calls[0][0];
    const filter = searchCall.body.query.bool.filter;
    expect(filter).toContainEqual(expect.objectContaining({ term: { status: 'sent' } }));
  });

  it('should search by campaignId', async () => {
    mockSearch.mockResolvedValue({
      hits: { total: { value: 0, relation: 'eq' }, hits: [] },
    });

    await searchEmails({ userId: 'user-1', campaignId: 'camp-1' });
    const searchCall = mockSearch.mock.calls[0][0];
    const filter = searchCall.body.query.bool.filter;
    expect(filter).toContainEqual(expect.objectContaining({ term: { campaignId: 'camp-1' } }));
  });

  it('should support pagination', async () => {
    mockSearch.mockResolvedValue({
      hits: { total: { value: 50, relation: 'eq' }, hits: [] },
    });

    const result = await searchEmails({ userId: 'user-1', page: 2, limit: 10 });
    expect(result!.page).toBe(2);
    expect(result!.limit).toBe(10);
    expect(result!.totalPages).toBe(5);

    const searchCall = mockSearch.mock.calls[0][0];
    expect(searchCall.body.from).toBe(10);
    expect(searchCall.body.size).toBe(10);
  });

  it('should return null when search fails', async () => {
    mockSearch.mockRejectedValue(new Error('Search error'));
    const result = await searchEmails({ userId: 'user-1', query: 'test' });
    expect(result).toBeNull();
  });
});

describe('PostgreSQL Fallback', () => {
  it('should report as not configured when URL is not set', () => {
    const originalUrl = process.env.ELASTICSEARCH_URL;
    process.env.ELASTICSEARCH_URL = '';

    jest.resetModules();
    jest.doMock('../config/env', () => ({
      env: {
        ELASTICSEARCH_URL: '',
        ELASTICSEARCH_INDEX: 'test-emails',
      },
    }));

    const { isElasticsearchConfigured: fallbackCheck } = require('../services/elasticsearch');
    const result = fallbackCheck();
    expect(result).toBe(false);

    process.env.ELASTICSEARCH_URL = originalUrl;
    jest.dontMock('../config/env');
  });
});
