import { Router, Request, Response } from 'express';
import db from '../config/database';
import { requireAuth } from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

router.get('/api/slack/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    const connection = await db('slack_connections')
      .where({ user_id: user.id })
      .first();

    if (connection) {
      res.json({
        connected: true,
        teamName: connection.team_name,
        createdAt: connection.created_at,
      });
    } else {
      res.json({ connected: false });
    }
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check Slack status' });
  }
});

router.get('/api/slack/connect', requireAuth, (req: Request, res: Response) => {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
    res.status(503).json({ error: 'Slack integration is not configured' });
    return;
  }

  const scopes = ['incoming-webhook', 'chat:write'].join(' ');
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${encodeURIComponent(env.SLACK_REDIRECT_URI)}`;

  res.json({ authUrl: slackAuthUrl });
});

router.get('/api/slack/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?error=slack_auth_failed`);
      return;
    }

    if (!code) {
      res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?error=no_code`);
      return;
    }

    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: code as string,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      ok: boolean;
      team?: { name: string };
      access_token?: string;
    };

    if (!tokenData.ok) {
      res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?error=slack_token_failed`);
      return;
    }

    const teamName = tokenData.team?.name || 'Unknown Team';
    const accessToken = tokenData.access_token || '';

    let webhookUrl = '';

    const channelsResponse = await fetch('https://slack.com/api/conversations.list', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const channelsData = await channelsResponse.json() as {
      ok: boolean;
      channels?: Array<{ id: string; name: string }>;
    };

    if (channelsData.ok && channelsData.channels && channelsData.channels.length > 0) {
      const generalChannel = channelsData.channels.find((c) => c.name === 'general');
      const channel = generalChannel || channelsData.channels[0];

      const webhookResponse = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: channel.id,
          text: 'ReachInbox Scheduler connected successfully! You will receive notifications here.',
        }),
      });

      webhookUrl = `https://hooks.slack.com/services/${env.SLACK_CLIENT_ID}/${channel.id}`;
    }

    const session = req.session as any;
    const userId = session?.passport?.user;

    if (!userId) {
      res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?error=no_user`);
      return;
    }

    await db('slack_connections')
      .insert({
        user_id: userId,
        team_name: teamName,
        webhook_url: webhookUrl,
        access_token: accessToken,
      })
      .onConflict('user_id')
      .merge({
        team_name: teamName,
        webhook_url: webhookUrl,
        access_token: accessToken,
        updated_at: new Date(),
      });

    res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?slack=connected`);
  } catch (error) {
    console.error('Error handling Slack callback:', error);
    res.redirect(`${env.NEXT_PUBLIC_API_URL}/settings?error=slack_callback_failed`);
  }
});

router.delete('/api/slack/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    await db('slack_connections').where({ user_id: user.id }).del();
    res.json({ message: 'Slack disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    res.status(500).json({ error: 'Failed to disconnect Slack' });
  }
});

export default router;
