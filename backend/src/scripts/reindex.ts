import db from '../config/database';
import { bulkIndexEmails } from '../services/emailIndexer';
import { ensureIndex, isElasticsearchConfigured } from '../services/elasticsearch';

export async function reindexAllEmails(): Promise<{ indexed: number; skipped: number; failed: number }> {
  if (!isElasticsearchConfigured()) {
    throw new Error('Elasticsearch is not configured');
  }

  await ensureIndex();

  const BATCH_SIZE = 500;
  let offset = 0;
  let totalIndexed = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  while (true) {
    const emails = await db('email_messages')
      .orderBy('created_at', 'asc')
      .offset(offset)
      .limit(BATCH_SIZE);

    if (emails.length === 0) break;

    const docs = emails.map((e: any) => ({
      id: e.id,
      userId: e.user_id,
      campaignId: e.campaign_id,
      recipient: e.recipient,
      recipientName: '',
      subject: e.subject,
      body: e.body,
      senderEmail: e.sender_email,
      status: e.status,
      scheduledAt: e.scheduled_at,
      sentAt: e.sent_at,
      createdAt: e.created_at,
      lastError: e.last_error,
    }));

    const result = await bulkIndexEmails(docs);
    totalIndexed += result.indexed;
    totalFailed += result.failed;

    offset += BATCH_SIZE;

    if (emails.length < BATCH_SIZE) break;
  }

  return { indexed: totalIndexed, skipped: totalSkipped, failed: totalFailed };
}

if (require.main === module) {
  reindexAllEmails()
    .then((result) => {
      console.log('Reindex complete:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Reindex failed:', err);
      process.exit(1);
    });
}
