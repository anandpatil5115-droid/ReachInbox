import { Router, Request, Response } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { emailQueue } from '../services/queueService';
import { requireAuth } from '../middleware/auth';
import { isElasticsearchConfigured, checkConnection as checkESConnection } from '../services/elasticsearch';
import { reindexAllEmails } from '../scripts/reindex';

const router = Router();

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(emailQueue as any, {
      readOnlyMode: false,
      description: 'Email sending queue',
    }),
  ],
  serverAdapter,
});

function requireAdmin(req: Request, res: Response, next: Function): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

router.use('/admin/queues', requireAdmin, serverAdapter.getRouter());

router.get('/api/admin/health', requireAdmin, async (req: Request, res: Response) => {
  const esConfigured = isElasticsearchConfigured();
  const esConnected = esConfigured ? await checkESConnection() : false;

  res.json({
    elasticsearch: {
      configured: esConfigured,
      connected: esConnected,
    },
  });
});

router.post('/api/admin/reindex', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await reindexAllEmails();
    res.json({
      message: 'Reindex complete',
      ...result,
    });
  } catch (error: any) {
    console.error('Reindex failed:', error);
    res.status(500).json({ error: 'Reindex failed', message: error.message });
  }
});

export default router;
