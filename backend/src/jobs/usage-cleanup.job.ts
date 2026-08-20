import cron from 'node-cron';
import prisma from '../utils/prisma';

export const cleanupOldUsage = async (days: number = 90): Promise<void> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  console.log(`[Cron] Starting usage cleanup. Deleting AIUsage older than ${cutoffDate.toISOString()}`);

  try {
    const result = await prisma.aIUsage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    console.log(`[Cron] Usage cleanup completed. Deleted ${result.count} records.`);
  } catch (error) {
    console.error(`[Cron] Failed to cleanup usage records:`, error);
  }
};

export const initUsageCleanupCron = (): void => {
  // Run daily at midnight
  cron.schedule('0 0 * * *', () => {
    const cleanupDays = parseInt(process.env.CLEANUP_DAYS || '90', 10);
    cleanupOldUsage(cleanupDays);
  });
  console.log('[Cron] Usage cleanup cron job initialized (runs daily at midnight)');
};
