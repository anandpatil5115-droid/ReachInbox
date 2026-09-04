import { Queue, QueueEvents, Worker, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import redis from '../config/redis';
import { env } from '../config/env';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database';
import { sendEmail } from './emailService';
import { checkHourlyLimit, getRemainingQuota, getNextAvailableSlot } from './rateLimiter';
import { getSlackConnection, sendRateLimitNotification, sendFailureNotification } from './slackService';

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

export const emailQueue = new Queue<EmailJobData>('email-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 86400,
      count: 1000,
    },
    removeOnFail: {
      age: 604800,
      count: 1000,
    },
  },
});

export const queueEvents = new QueueEvents('email-queue', { connection });

export async function scheduleEmail(emailMessage: {
  id: string;
  userId: string;
  senderEmail: string;
  recipient: string;
  subject: string;
  body: string;
  hourlyLimit: number;
  scheduledAt: Date;
}): Promise<string> {
  const delay = new Date(emailMessage.scheduledAt).getTime() - Date.now();

  const jobOptions: JobsOptions = {
    jobId: emailMessage.id,
    delay: Math.max(0, delay),
  };

  const job = await emailQueue.add(
    'send-email',
    {
      emailMessageId: emailMessage.id,
      userId: emailMessage.userId,
      senderEmail: emailMessage.senderEmail,
      recipient: emailMessage.recipient,
      subject: emailMessage.subject,
      body: emailMessage.body,
      hourlyLimit: emailMessage.hourlyLimit,
    },
    jobOptions
  );

  await db('email_messages')
    .where({ id: emailMessage.id })
    .update({ bullmq_job_id: job.id || '' });

  return job.id || '';
}

export async function scheduleCampaignEmails(
  campaign: {
    id: string;
    userId: string;
    senderEmail: string;
    subject: string;
    body: string;
    hourlyLimit: number;
    startAt: Date;
    delaySeconds: number;
  },
  emails: Array<{
    id: string;
    recipient: string;
  }>
): Promise<string[]> {
  const jobIds: string[] = [];
  const startTime = new Date(campaign.startAt).getTime();
  let delayAccumulator = 0;

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const scheduledTime = new Date(startTime + delayAccumulator);

    const jobId = await scheduleEmail({
      id: email.id,
      userId: campaign.userId,
      senderEmail: campaign.senderEmail,
      recipient: email.recipient,
      subject: campaign.subject,
      body: campaign.body,
      hourlyLimit: campaign.hourlyLimit,
      scheduledAt: scheduledTime,
    });

    jobIds.push(jobId);
    delayAccumulator += campaign.delaySeconds * 1000;
  }

  return jobIds;
}

export async function getQueueMetrics() {
  const [waiting, delayed, active, completed, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
  ]);

  return {
    waiting,
    delayed,
    active,
    completed,
    failed,
  };
}

export async function pauseQueue(): Promise<void> {
  await emailQueue.pause();
}

export async function resumeQueue(): Promise<void> {
  await emailQueue.resume();
}

export async function removeJob(jobId: string): Promise<void> {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.remove();
  }
}

export async function retryJob(jobId: string): Promise<void> {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    await job.retry();
  }
}
