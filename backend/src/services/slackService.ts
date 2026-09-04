import { env } from '../config/env';
import redis from '../config/redis';
import { v4 as uuidv4 } from 'uuid';

interface SlackNotificationData {
  senderEmail: string;
  hourlyLimit: number;
  delayedCount: number;
  resumeTime: Date;
}

interface SlackConnection {
  webhookUrl: string;
  accessToken?: string;
}

export async function sendRateLimitNotification(
  webhookUrl: string,
  data: SlackNotificationData
): Promise<boolean> {
  try {
    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ Rate Limit Warning',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender Email:*\n${data.senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n${data.hourlyLimit} emails/hour`,
            },
          ],
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Delayed Emails:*\n${data.delayedCount}`,
            },
            {
              type: 'mrkdwn',
              text: `*Resume Time:*\n${data.resumeTime.toISOString()}`,
            },
          ],
        },
        {
          type: 'divider',
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'ReachInbox Scheduler | Email delivery paused due to rate limiting',
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack notification:', error);
    return false;
  }
}

export async function sendFailureNotification(
  webhookUrl: string,
  data: {
    senderEmail: string;
    recipient: string;
    error: string;
  }
): Promise<boolean> {
  try {
    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '❌ Email Delivery Failed',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n${data.senderEmail}`,
            },
            {
              type: 'mrkdwn',
              text: `*Recipient:*\n${data.recipient}`,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Error:*\n\`\`\`${data.error}\`\`\``,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: 'ReachInbox Scheduler',
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to send Slack failure notification:', error);
    return false;
  }
}

export async function getSlackConnection(userId: string): Promise<SlackConnection | null> {
  const db = (await import('../config/database')).default;
  const connection = await db('slack_connections')
    .where({ user_id: userId })
    .first();

  if (!connection) {
    return null;
  }

  return {
    webhookUrl: connection.webhook_url,
    accessToken: connection.access_token,
  };
}
