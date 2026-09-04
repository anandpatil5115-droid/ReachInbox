import { getClient, getIndexName, isElasticsearchConfigured } from './elasticsearch';

interface EmailDocument {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  recipientName?: string;
  subject: string;
  body: string;
  senderEmail: string;
  status: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  createdAt: string | Date;
  lastError?: string | null;
}

export async function indexEmail(doc: EmailDocument): Promise<void> {
  if (!isElasticsearchConfigured()) return;
  const c = getClient();
  if (!c) return;
  try {
    await c.index({
      index: getIndexName(),
      id: doc.id,
      document: {
        id: doc.id,
        userId: doc.userId,
        campaignId: doc.campaignId,
        recipient: doc.recipient,
        recipientName: doc.recipientName || '',
        subject: doc.subject,
        body: doc.body,
        senderEmail: doc.senderEmail,
        status: doc.status,
        scheduledAt: doc.scheduledAt,
        sentAt: doc.sentAt || null,
        createdAt: doc.createdAt,
        lastError: doc.lastError || null,
      },
    });
  } catch (err) {
    console.error(`[Elasticsearch] Failed to index email ${doc.id}:`, err);
  }
}

export async function updateEmailIndex(
  id: string,
  updates: Partial<Omit<EmailDocument, 'id'>>
): Promise<void> {
  if (!isElasticsearchConfigured()) return;
  const c = getClient();
  if (!c) return;
  try {
    await c.update({
      index: getIndexName(),
      id,
      doc: updates,
    });
  } catch (err) {
    console.error(`[Elasticsearch] Failed to update email ${id}:`, err);
  }
}

export async function bulkIndexEmails(docs: EmailDocument[]): Promise<{ indexed: number; failed: number }> {
  if (!isElasticsearchConfigured()) return { indexed: 0, failed: 0 };
  const c = getClient();
  if (!c) return { indexed: 0, failed: 0 };

  let indexed = 0;
  let failed = 0;

  const operations = docs.flatMap((doc) => [
    { index: { _index: getIndexName(), _id: doc.id } },
    {
      id: doc.id,
      userId: doc.userId,
      campaignId: doc.campaignId,
      recipient: doc.recipient,
      recipientName: doc.recipientName || '',
      subject: doc.subject,
      body: doc.body,
      senderEmail: doc.senderEmail,
      status: doc.status,
      scheduledAt: doc.scheduledAt,
      sentAt: doc.sentAt || null,
      createdAt: doc.createdAt,
      lastError: doc.lastError || null,
    },
  ]);

  try {
    const result = await c.bulk({ operations });
    if (result.errors) {
      for (const item of result.items) {
        if (item.index?.error) {
          failed++;
        } else {
          indexed++;
        }
      }
    } else {
      indexed = docs.length;
    }
  } catch (err) {
    console.error('[Elasticsearch] Bulk index failed:', err);
    failed = docs.length;
  }

  return { indexed, failed };
}

export interface SearchParams {
  userId: string;
  query?: string;
  status?: string;
  campaignId?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  emails: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  searchProvider: string;
}

export async function searchEmails(params: SearchParams): Promise<SearchResult | null> {
  if (!isElasticsearchConfigured()) return null;
  const c = getClient();
  if (!c) return null;

  const {
    userId,
    query,
    status,
    campaignId,
    sortField = 'scheduledAt',
    sortOrder = 'desc',
    page = 1,
    limit = 20,
  } = params;

  const must: any[] = [{ term: { userId } }];
  const filter: any[] = [];

  if (query && query.trim()) {
    must.push({
      multi_match: {
        query: query.trim(),
        fields: ['recipient^2', 'recipientName^2', 'subject^2', 'senderEmail', 'body'],
        type: 'best_fields',
        fuzziness: 'AUTO',
      },
    });
  }

  if (status) {
    filter.push({ term: { status } });
  }

  if (campaignId) {
    filter.push({ term: { campaignId } });
  }

  try {
    const result = await c.search({
      index: getIndexName(),
      body: {
        query: {
          bool: {
            must,
            filter,
          },
        },
        sort: [{ [sortField]: { order: sortOrder } }],
        from: (page - 1) * limit,
        size: limit,
        highlight: {
          fields: {
            recipient: {},
            subject: {},
          },
        },
      },
    });

    const hits = result.hits.hits || [];
    const total = typeof result.hits.total === 'number'
      ? result.hits.total
      : (result.hits.total as any)?.value || 0;

    return {
      emails: hits.map((hit: any) => ({
        ...hit._source,
        _score: hit._score,
        _highlights: hit.highlight,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      searchProvider: 'elasticsearch',
    };
  } catch (err) {
    console.error('[Elasticsearch] Search failed:', err);
    return null;
  }
}
