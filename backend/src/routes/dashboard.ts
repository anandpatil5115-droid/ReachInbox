import { Router, Request, Response } from 'express';
import db from '../config/database';
import { requireAuth } from '../middleware/auth';
import { getQueueMetrics } from '../services/queueService';

const router = Router();

router.get('/api/dashboard/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    const [
      scheduledResult,
      sentThisWeekResult,
      totalCampaignsResult,
      activeCampaignsResult,
      queueMetrics,
    ] = await Promise.all([
      db('email_messages')
        .where({ user_id: user.id, status: 'pending' })
        .count('* as count')
        .first(),
      db('email_messages')
        .where({ user_id: user.id, status: 'sent' })
        .where('sent_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .count('* as count')
        .first(),
      db('campaigns')
        .where({ user_id: user.id })
        .count('* as count')
        .first(),
      db('email_messages')
        .where({ user_id: user.id, status: 'processing' })
        .count('* as count')
        .first(),
      getQueueMetrics(),
    ]);

    const recentCampaigns = await db('campaigns')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'subject', 'total_recipients', 'created_at');

    const campaignsWithStats = await Promise.all(
      recentCampaigns.map(async (campaign) => {
        const stats = await db('email_messages')
          .where({ campaign_id: campaign.id })
          .select(
            db.raw("COUNT(*) FILTER (WHERE status = 'sent') as sent"),
            db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending")
          )
          .first();

        return {
          id: campaign.id,
          subject: campaign.subject,
          totalRecipients: campaign.total_recipients,
          sent: parseInt(stats?.sent || '0'),
          pending: parseInt(stats?.pending || '0'),
          createdAt: campaign.created_at,
        };
      })
    );

    res.json({
      scheduledEmails: parseInt(scheduledResult?.count as string || '0'),
      sentThisWeek: parseInt(sentThisWeekResult?.count as string || '0'),
      totalCampaigns: parseInt(totalCampaignsResult?.count as string || '0'),
      activeProcessing: parseInt(activeCampaignsResult?.count as string || '0'),
      queueHealth: queueMetrics,
      recentCampaigns: campaignsWithStats,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

router.get('/api/dashboard/queue-health', requireAuth, async (req: Request, res: Response) => {
  try {
    const metrics = await getQueueMetrics();

    res.json({
      waiting: metrics.waiting,
      delayed: metrics.delayed,
      active: metrics.active,
      completed: metrics.completed,
      failed: metrics.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching queue health:', error);
    res.status(500).json({ error: 'Failed to fetch queue health' });
  }
});

export default router;
