import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';

import { env } from './config/env';
import db from './config/database';
import authRoutes from './routes/auth';
import campaignRoutes from './routes/campaigns';
import emailRoutes from './routes/emails';
import slackRoutes from './routes/slack';
import dashboardRoutes from './routes/dashboard';
import adminRoutes from './routes/admin';
import emailWorker from './workers/emailWorker';
import { isElasticsearchConfigured, ensureIndex } from './services/elasticsearch';

const app = express();
const PORT = env.PORT;

const pgPool = new Pool({
  connectionString: env.DATABASE_URL,
});

const PgSession = pgSession(session);

app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: env.NEXT_PUBLIC_API_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const sessionStore = new PgSession({
  pool: pgPool,
  tableName: 'sessions',
  createTableIfMissing: false,
});

app.use(
  session({
    store: sessionStore,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

app.use(authRoutes);
app.use(campaignRoutes);
app.use(emailRoutes);
app.use(slackRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);

if (isElasticsearchConfigured()) {
  ensureIndex().then(() => {
    console.log('[Elasticsearch] Index initialization complete.');
  }).catch((err) => {
    console.error('[Elasticsearch] Index initialization failed:', err);
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${env.NODE_ENV}`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  await emailWorker.close();
  await db.destroy();
  await pgPool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  await emailWorker.close();
  await db.destroy();
  await pgPool.end();
  process.exit(0);
});

export default app;
