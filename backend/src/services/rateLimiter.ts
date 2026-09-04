import Redis from 'ioredis';
import redis from '../config/redis';
import { env } from '../config/env';

function getHourWindow(): number {
  const now = new Date();
  return Math.floor(now.getTime() / (1000 * 60 * 60));
}

export async function checkHourlyLimit(senderEmail: string, limit: number): Promise<{ allowed: boolean; count: number }> {
  const hourWindow = getHourWindow();
  const key = `rate_limit:${senderEmail}:${hourWindow}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 3600);
  }

  return {
    allowed: count <= limit,
    count,
  };
}

export async function getRemainingQuota(senderEmail: string, limit: number): Promise<number> {
  const hourWindow = getHourWindow();
  const key = `rate_limit:${senderEmail}:${hourWindow}`;

  const count = await redis.get(key);
  const currentCount = count ? parseInt(count, 10) : 0;

  return Math.max(0, limit - currentCount);
}

export async function getNextAvailableSlot(senderEmail: string): Promise<Date> {
  const hourWindow = getHourWindow();
  const key = `rate_limit:${senderEmail}:${hourWindow}`;

  const count = await redis.get(key);
  const currentCount = count ? parseInt(count, 10) : 0;

  if (currentCount < env.MAX_EMAILS_PER_HOUR) {
    return new Date();
  }

  const currentHourStart = hourWindow * 1000 * 60 * 60;
  return new Date(currentHourStart + 1000 * 60 * 60);
}

export async function decrementCounter(senderEmail: string): Promise<void> {
  const hourWindow = getHourWindow();
  const key = `rate_limit:${senderEmail}:${hourWindow}`;

  await redis.decr(key);
}
