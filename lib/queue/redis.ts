// Singleton ioredis connection used by every BullMQ Queue/Worker.
//
// BullMQ requires `maxRetriesPerRequest: null` and `enableReadyCheck: false`
// for Worker/QueueEvents connections. Defaulting them here keeps callers
// from re-passing the same opts in five places.

import IORedis, { type Redis, type RedisOptions } from 'ioredis';

let connection: Redis | null = null;

export function getRedisUrl(): string {
  return process.env.REDIS_URL || 'redis://localhost:6379';
}

export function getConnection(): Redis {
  if (connection) return connection;
  const url = getRedisUrl();
  const opts: RedisOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: false,
  };
  connection = new IORedis(url, opts);
  return connection;
}

export async function closeConnection(): Promise<void> {
  if (!connection) return;
  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
  connection = null;
}
