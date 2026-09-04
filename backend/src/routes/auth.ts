import { Router, Request, Response } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import db from '../config/database';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';

const router = Router();

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const providerId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const avatarUrl = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'), undefined);
          }

          const existingUser = await db('users')
            .where({ provider_id: providerId })
            .orWhere({ email })
            .first();

          let user;

          if (existingUser) {
            const [updated] = await db('users')
              .where({ id: existingUser.id })
              .update({
                provider_id: providerId,
                name,
                email,
                avatar_url: avatarUrl,
                updated_at: new Date(),
              })
              .returning('*');
            user = updated;
          } else {
            const [created] = await db('users')
              .insert({
                provider_id: providerId,
                name,
                email,
                avatar_url: avatarUrl,
              })
              .returning('*');
            user = created;
          }

          if (!user) {
            return done(new Error('Failed to create or update user'), undefined);
          }

          done(null, user);
        } catch (error) {
          console.error('Google OAuth error:', error);
          done(error as Error, undefined);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db('users').where({ id }).first();
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

router.get('/api/auth/google', (req: Request, res: Response) => {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    res.status(503).json({ error: 'Google OAuth is not configured' });
    return;
  }

  const auth = passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  });

  auth(req, res, () => {});
});

router.get(
  '/api/auth/google/callback',
  passport.authenticate('google', {
    failureRedirect: 'http://localhost:3000?error=auth_failed',
    successRedirect: 'http://localhost:3000',
  })
);

router.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as any;
  res.json({
    id: user.id,
    providerId: user.provider_id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatar_url,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  });
});

router.post('/api/auth/logout', (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to logout' });
      return;
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        res.status(500).json({ error: 'Failed to destroy session' });
        return;
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Logged out successfully' });
    });
  });
});

export default router;
