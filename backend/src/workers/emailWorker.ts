import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import db from '../config/database';
import { env } from '../config/env';
import { sendEmail } from '../services/emailService';
import { checkHourlyLimit, getRemainingQuota, getNextAvailableSlot } from '../services/rateLimiter';
import { getSlackConnection, sendRateLimitNotification, sendFailureNotification } from '../services/slackService';
import { emailQueue } from '../services/queueService';
import { updateEmailIndex } from '../services/emailIndexer';

interface EmailJobData {
  emailMessageId: string;
  userId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
}

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  async (job: Job<EmailJobData>) => {
    const { emailMessageId, userId, senderEmail, recipient, subject, body, hourlyLimit } = job.data;

    const emailMessage = await db('email_messages')
      .where({ id: emailMessageId })
      .first();

    if (!emailMessage) {
      throw new Error(`Email message ${emailMessageId} not found`);
    }

    if (emailMessage.status === 'sent') {
      return { skipped: true, reason: 'Already sent' };
    }

    const { allowed, count } = await checkHourlyLimit(senderEmail, hourlyLimit);

    if (!allowed) {
      const nextSlot = await getNextAvailableSlot(senderEmail);
      const delayUntilNextHour = nextSlot.getTime() - Date.now();

      const slackConnection = await getSlackConnection(userId);
      if (slackConnection) {
        const remaining = await getRemainingQuota(senderEmail, hourlyLimit);
        await sendRateLimitNotification(slackConnection.webhookUrl, {
          senderEmail,
          hourlyLimit,
          delayedCount: 1,
          resumeTime: nextSlot,
        });
      }

      await db('email_messages')
        .where({ id: emailMessageId })
        .update({
          status: 'pending',
          last_error: `Rate limited. Rescheduled to ${nextSlot.toISOString()}`,
        });

      const newJob = await emailQueue.add(
        'send-email',
        job.data,
        {
          delay: Math.max(delayUntilNextHour, 60000),
          jobId: emailMessageId,
        }
      );

      return { rescheduled: true, nextSlot: nextSlot.toISOString(), jobId: newJob.id };
    }

    await db('email_messages')
      .where({ id: emailMessageId })
      .update({ status: 'processing' });

    updateEmailIndex(emailMessageId, { status: 'processing' }).catch(() => {});

    try {
      const result = await sendEmail({
        from: senderEmail,
        to: recipient,
        subject,
        html: body,
      });

      await db('email_messages')
        .where({ id: emailMessageId })
        .update({
          status: 'sent',
          provider_message_id: result.messageId,
          sent_at: new Date(),
          last_error: null,
        });

      updateEmailIndex(emailMessageId, {
        status: 'sent',
        sentAt: new Date(),
        lastError: null,
      }).catch(() => {});

      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred';

      await db('email_messages')
        .where({ id: emailMessageId })
        .update({
          status: 'failed',
          last_error: errorMessage,
        });

      updateEmailIndex(emailMessageId, {
        status: 'failed',
        lastError: errorMessage,
      }).catch(() => {});

      const slackConnection = await getSlackConnection(userId);
      if (slackConnection) {
        await sendFailureNotification(slackConnection.webhookUrl, {
          senderEmail,
          recipient,
          error: errorMessage,
        });
      }

      throw error;
    }
  },
  {
    connection,
    concurrency: env.WORKER_CONCURRENCY,
    limiter: {
      max: env.MAX_EMAILS_PER_HOUR,
      duration: 3600000,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed for email ${job.data.emailMessageId}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed for email ${job?.data?.emailMessageId}:`, err.message);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

export default emailWorker;
