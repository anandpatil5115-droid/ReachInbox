import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z.string().default('a-random-secret-string-change-in-production'),
  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/api/auth/google/callback'),
  ETHEREAL_HOST: z.string().default('smtp.ethereal.email'),
  ETHEREAL_PORT: z.coerce.number().default(587),
  ETHEREAL_USER: z.string().default(''),
  ETHEREAL_PASSWORD: z.string().default(''),
  ETHEREAL_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SLACK_CLIENT_ID: z.string().default(''),
  SLACK_CLIENT_SECRET: z.string().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:3001/api/slack/callback'),
  WORKER_CONCURRENCY: z.coerce.number().default(5),
  MIN_SEND_DELAY_MS: z.coerce.number().default(2000),
  MAX_EMAILS_PER_HOUR: z.coerce.number().default(200),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3001'),
  ELASTICSEARCH_URL: z.string().optional(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  ELASTICSEARCH_INDEX: z.string().default('reachinbox-emails'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
