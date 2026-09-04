import { Router, Request, Response } from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import db from '../config/database';
import { requireAuth } from '../middleware/auth';
import { validateAndCleanEmails } from '../utils/emailValidator';
import { scheduleCampaignEmails } from '../services/queueService';
import { indexEmail } from '../services/emailIndexer';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'text/csv' ||
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.txt')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and TXT files are allowed'));
    }
  },
});

const campaignSchema = z.object({
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
  senderEmail: z.string().email(),
  startAt: z.string().datetime(),
  delaySeconds: z.number().min(1).max(3600).default(2),
  hourlyLimit: z.number().min(1).max(1000).default(200),
});

router.get('/api/campaigns', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    let query = db('campaigns').where({ user_id: user.id });

    if (search) {
      query = query.where(function () {
        this.where('subject', 'ilike', `%${search}%`)
          .orWhere('sender_email', 'ilike', `%${search}%`);
      });
    }

    const [{ count: total }] = await query.clone().count('* as count');

    const campaigns = await query
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit);

    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const stats = await db('email_messages')
          .where({ campaign_id: campaign.id })
          .select(
            db.raw('COUNT(*) as total'),
            db.raw("COUNT(*) FILTER (WHERE status = 'sent') as sent"),
            db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
            db.raw("COUNT(*) FILTER (WHERE status = 'processing') as processing"),
            db.raw("COUNT(*) FILTER (WHERE status = 'failed') as failed")
          )
          .first();

        return {
          id: campaign.id,
          userId: campaign.user_id,
          subject: campaign.subject,
          body: campaign.body,
          senderEmail: campaign.sender_email,
          startAt: campaign.start_at,
          delaySeconds: campaign.delay_seconds,
          hourlyLimit: campaign.hourly_limit,
          totalRecipients: campaign.total_recipients,
          createdAt: campaign.created_at,
          stats: {
            total: parseInt(stats?.total || '0'),
            sent: parseInt(stats?.sent || '0'),
            pending: parseInt(stats?.pending || '0'),
            processing: parseInt(stats?.processing || '0'),
            failed: parseInt(stats?.failed || '0'),
          },
        };
      })
    );

    res.json({
      campaigns: campaignsWithStats,
      pagination: {
        page,
        limit,
        total: parseInt(total as string),
        totalPages: Math.ceil(parseInt(total as string) / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/api/campaigns', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const user = req.user as any;

    let parsed;
    try {
      parsed = JSON.parse(req.body.data || '{}');
    } catch {
      res.status(400).json({ error: 'Invalid JSON in request body' });
      return;
    }

    const validation = campaignSchema.safeParse(parsed);

    if (!validation.success) {
      const fields = validation.error.errors.map((e) => e.path.join('.')).join(', ');
      res.status(400).json({
        error: `Validation failed for: ${fields}`,
        details: validation.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    const { subject, body, senderEmail, startAt, delaySeconds, hourlyLimit } = validation.data;

    if (!req.file) {
      res.status(400).json({ error: 'CSV/TXT file with recipients is required' });
      return;
    }

    const fileContent = req.file.buffer.toString('utf-8');
    let emailText = fileContent;

    if (req.file.originalname.endsWith('.csv')) {
      try {
        const records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
        });
        const emails = records
          .map((record: any) => record.email || record.recipient || Object.values(record)[0])
          .filter(Boolean);
        emailText = emails.join('\n');
      } catch {
        emailText = fileContent;
      }
    }

    const { valid: validEmails, invalid: invalidEmails } = validateAndCleanEmails(emailText);

    if (validEmails.length === 0) {
      res.status(400).json({
        error: 'No valid email addresses found in the file',
        invalidEmails,
      });
      return;
    }

    const campaignId = uuidv4();
    const emailMessages = validEmails.map((recipient) => ({
      id: uuidv4(),
      user_id: user.id,
      campaign_id: campaignId,
      recipient,
      subject,
      body,
      sender_email: senderEmail,
      hourly_limit: hourlyLimit,
      scheduled_at: new Date(startAt),
      status: 'pending',
    }));

    await db.transaction(async (trx) => {
      await trx('campaigns').insert({
        id: campaignId,
        user_id: user.id,
        subject,
        body,
        sender_email: senderEmail,
        start_at: new Date(startAt),
        delay_seconds: delaySeconds,
        hourly_limit: hourlyLimit,
        total_recipients: validEmails.length,
      });

      await trx('email_messages').insert(emailMessages);
    });

    const jobIds = await scheduleCampaignEmails(
      {
        id: campaignId,
        userId: user.id,
        senderEmail,
        subject,
        body,
        hourlyLimit,
        startAt: new Date(startAt),
        delaySeconds,
      },
      emailMessages.map((msg) => ({ id: msg.id, recipient: msg.recipient }))
    );

    for (const msg of emailMessages) {
      indexEmail({
        id: msg.id,
        userId: msg.user_id,
        campaignId: msg.campaign_id,
        recipient: msg.recipient,
        subject: msg.subject,
        body: msg.body,
        senderEmail: msg.sender_email,
        status: msg.status,
        scheduledAt: msg.scheduled_at,
        createdAt: new Date(),
      }).catch(() => {});
    }

    const campaign = await db('campaigns').where({ id: campaignId }).first();

    res.status(201).json({
      id: campaign.id,
      userId: campaign.user_id,
      subject: campaign.subject,
      body: campaign.body,
      senderEmail: campaign.sender_email,
      startAt: campaign.start_at,
      delaySeconds: campaign.delay_seconds,
      hourlyLimit: campaign.hourly_limit,
      totalRecipients: campaign.total_recipients,
      createdAt: campaign.created_at,
      scheduledEmails: emailMessages.length,
      invalidEmails,
    });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

router.get('/api/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const campaign = await db('campaigns')
      .where({ id, user_id: user.id })
      .first();

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    const stats = await db('email_messages')
      .where({ campaign_id: id })
      .select(
        db.raw('COUNT(*) as total'),
        db.raw("COUNT(*) FILTER (WHERE status = 'sent') as sent"),
        db.raw("COUNT(*) FILTER (WHERE status = 'pending') as pending"),
        db.raw("COUNT(*) FILTER (WHERE status = 'processing') as processing"),
        db.raw("COUNT(*) FILTER (WHERE status = 'failed') as failed")
      )
      .first();

    const emails = await db('email_messages')
      .where({ campaign_id: id })
      .orderBy('scheduled_at', 'asc');

    res.json({
      id: campaign.id,
      userId: campaign.user_id,
      subject: campaign.subject,
      body: campaign.body,
      senderEmail: campaign.sender_email,
      startAt: campaign.start_at,
      delaySeconds: campaign.delay_seconds,
      hourlyLimit: campaign.hourly_limit,
      totalRecipients: campaign.total_recipients,
      createdAt: campaign.created_at,
      stats: {
        total: parseInt(stats?.total || '0'),
        sent: parseInt(stats?.sent || '0'),
        pending: parseInt(stats?.pending || '0'),
        processing: parseInt(stats?.processing || '0'),
        failed: parseInt(stats?.failed || '0'),
      },
      emails: emails.map((email) => ({
        id: email.id,
        recipient: email.recipient,
        status: email.status,
        scheduledAt: email.scheduled_at,
        sentAt: email.sent_at,
        lastError: email.last_error,
      })),
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

router.delete('/api/campaigns/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const { id } = req.params;

    const campaign = await db('campaigns')
      .where({ id, user_id: user.id })
      .first();

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    await db.transaction(async (trx) => {
      await trx('email_messages').where({ campaign_id: id }).del();
      await trx('campaigns').where({ id }).del();
    });

    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
