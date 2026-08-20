import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redisClient = createClient({
  url: redisUrl,
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis');
});

export const connectRedis = async () => {
  if (!redisUrl) {
    console.warn('REDIS_URL is not set. Redis features will be disabled.');
    return;
  }
  
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};
