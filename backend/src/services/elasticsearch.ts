import { Client } from '@elastic/elasticsearch';
import { env } from '../config/env';

let client: Client | null = null;
let isConfigured = false;

function getConfig() {
  const url = (env as any).ELASTICSEARCH_URL;
  const apiKey = (env as any).ELASTICSEARCH_API_KEY;
  return { url, apiKey };
}

export function isElasticsearchConfigured(): boolean {
  if (isConfigured) return client !== null;
  const { url } = getConfig();
  isConfigured = true;
  if (!url) {
    console.log('[Elasticsearch] Not configured (ELASTICSEARCH_URL not set). Using PostgreSQL fallback.');
    return false;
  }
  try {
    const opts: any = { node: url };
    if (getConfig().apiKey) {
      opts.auth = { apiKey: getConfig().apiKey };
    }
    client = new Client(opts);
    console.log('[Elasticsearch] Client created.');
    return true;
  } catch (err) {
    console.error('[Elasticsearch] Failed to create client:', err);
    client = null;
    return false;
  }
}

export function getClient(): Client | null {
  if (!isConfigured) isElasticsearchConfigured();
  return client;
}

export function getIndexName(): string {
  return (env as any).ELASTICSEARCH_INDEX || 'reachinbox-emails';
}

export async function checkConnection(): Promise<boolean> {
  const c = getClient();
  if (!c) return false;
  try {
    await c.ping();
    return true;
  } catch {
    return false;
  }
}

export const EMAIL_INDEX_MAPPING = {
  settings: {
    number_of_shards: 1,
    number_of_replicas: 0,
  },
  mappings: {
    properties: {
      id: { type: 'keyword' },
      userId: { type: 'keyword' },
      campaignId: { type: 'keyword' },
      recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      recipientName: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      subject: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      body: { type: 'text' },
      senderEmail: { type: 'text', fields: { keyword: { type: 'keyword' } } },
      status: { type: 'keyword' },
      scheduledAt: { type: 'date' },
      sentAt: { type: 'date' },
      createdAt: { type: 'date' },
      lastError: { type: 'text' },
    },
  },
};

export async function ensureIndex(): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    const exists = await c.indices.exists({ index: getIndexName() });
    if (!exists) {
      await c.indices.create({ index: getIndexName(), ...EMAIL_INDEX_MAPPING });
      console.log(`[Elasticsearch] Index "${getIndexName()}" created.`);
    }
  } catch (err) {
    console.error('[Elasticsearch] Failed to ensure index:', err);
  }
}
