import { Router, Request, Response } from 'express';
import { z } from 'zod';
import db from '../config/database';
import { requireAuth } from '../middleware/auth';
import { searchEmails } from '../services/emailIndexer';
import { isElasticsearchConfigured } from '../services/elasticsearch';

const router = Router();

router.get('/api/emails', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    const campaignId = req.query.campaign_id as string;
    const search = req.query.search as string;
    const sortField = (req.query.sort as string) || 'scheduled_at';
    const sortOrder = (req.query.order as string) === 'asc' ? 'asc' : 'desc';

    if (search && search.trim() && isElasticsearchConfigured()) {
      const esResult = await searchEmails({
        userId: user.id,
        query: search,
        status,
        campaignId,
        sortField: sortField === 'scheduled_at' ? 'scheduledAt' : sortField === 'sent_at' ? 'sentAt' : 'createdAt',
        sortOrder,
        page,
        limit,
      });

      if (esResult) {
        res.json({
          emails: esResult.emails.map((e: any) => ({
            id: e.id,
            userId: e.userId,
            campaignId: e.campaignId,
            recipient: e.recipient,
            subject: e.subject,
            body: e.body,
            senderEmail: e.senderEmail,
            hourlyLimit: e.hourlyLimit,
            scheduledAt: e.scheduledAt,
            sentAt: e.sentAt,
            status: e.status,
            lastError: e.lastError,
            providerMessageId: e.providerMessageId,
            bullmqJobId: e.bullmqJobId,
            createdAt: e.createdAt,
          })),
          pagination: {
            page: esResult.page,
            limit: esResult.limit,
            total: esResult.total,
            totalPages: esResult.totalPages,
          },
          searchProvider: esResult.searchProvider,
        });
        return;
      }
    }

    let query = db('email_messages').where({ user_id: user.id });

    if (status) {
      query = query.where({ status });
    }

    if (campaignId) {
      query = query.where({ campaign_id: campaignId });
    }

    if (search && search.trim()) {
      query = query.where(function () {
        this.where('recipient', 'ilike', `%${search}%`)
          .orWhere('subject', 'ilike', `%${search}%`)
          .orWhere('sender_email', 'ilike', `%${search}%`);
      });
    }

    const sortColumn = sortField === 'sent_at' ? 'sent_at' : sortField === 'created_at' ? 'created_at' : 'scheduled_at';
    const [{ count: total }] = await query.clone().count('* as count');

    const emails = await query
      .orderBy(sortColumn, sortOrder)
      .offset((page - 1) * limit)
      .limit(limit);

    res.json({
      emails: emails.map((email) => ({
        id: email.id,
        userId: email.user_id,
        campaignId: email.campaign_id,
        recipient: email.recipient,
        subject: email.subject,
        body: email.body,
        senderEmail: email.sender_email,
        hourlyLimit: email.hourly_limit,
        scheduledAt: email.scheduled_at,
        sentAt: email.sent_at,
        status: email.status,
        lastError: email.last_error,
        providerMessageId: email.provider_message_id,
        bullmqJobId: email.bullmq_job_id,
        createdAt: email.created_at,
      })),
      pagination: {
        page,
        limit,
        total: parseInt(total as string),
        totalPages: Math.ceil(parseInt(total as string) / limit),
      },
      searchProvider: 'postgres-fallback',
    });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

router.get('/api/emails/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    const [scheduledResult, sentThisWeekResult, failedResult, totalResult] = await Promise.all([
      db('email_messages')
        .where({ user_id: user.id, status: 'pending' })
        .count('* as count')
        .first(),
      db('email_messages')
        .where({ user_id: user.id, status: 'sent' })
        .where('sent_at', '>=', db.raw("NOW() - INTERVAL '7 days'"))
        .count('* as count')
        .first(),
      db('email_messages')
        .where({ user_id: user.id, status: 'failed' })
        .count('* as count')
        .first(),
      db('email_messages')
        .where({ user_id: user.id })
        .count('* as count')
        .first(),
    ]);

    const recentCampaigns = await db('campaigns')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'subject', 'total_recipients', 'created_at');

    res.json({
      scheduledEmails: parseInt(scheduledResult?.count as string || '0'),
      sentThisWeek: parseInt(sentThisWeekResult?.count as string || '0'),
      failedEmails: parseInt(failedResult?.count as string || '0'),
      totalEmails: parseInt(totalResult?.count as string || '0'),
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        subject: c.subject,
        totalRecipients: c.total_recipients,
        createdAt: c.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching email stats:', error);
    res.status(500).json({ error: 'Failed to fetch email stats' });
  }
});

router.get('/api/emails/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const email = await db('email_messages')
      .where({ id, user_id: user.id })
      .first();

    if (!email) {
      res.status(404).json({ error: 'Email not found' });
      return;
    }

    const campaign = await db('campaigns')
      .where({ id: email.campaign_id })
      .first();

    res.json({
      id: email.id,
      userId: email.user_id,
      campaignId: email.campaign_id,
      recipient: email.recipient,
      subject: email.subject,
      body: email.body,
      senderEmail: email.sender_email,
      hourlyLimit: email.hourly_limit,
      scheduledAt: email.scheduled_at,
      sentAt: email.sent_at,
      status: email.status,
      lastError: email.last_error,
      providerMessageId: email.provider_message_id,
      bullmqJobId: email.bullmq_job_id,
      createdAt: email.created_at,
      campaign: campaign
        ? {
            id: campaign.id,
            subject: campaign.subject,
            senderEmail: campaign.sender_email,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching email:', error);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

export default router;
