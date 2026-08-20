import { cleanupOldUsage } from '../jobs/usage-cleanup.job';
import prisma from '../utils/prisma';

// Mock Prisma
jest.mock('../utils/prisma', () => ({
  aIUsage: {
    deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
  },
}));

describe('Cron Jobs', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call prisma.aIUsage.deleteMany with the correct date filter', async () => {
    await cleanupOldUsage(90);

    // Verify it was called exactly once
    expect(prisma.aIUsage.deleteMany).toHaveBeenCalledTimes(1);

    // Get the first argument of the first call
    const callArgs = (prisma.aIUsage.deleteMany as jest.Mock).mock.calls[0][0];

    // Assert that the 'lt' constraint is a Date object
    expect(callArgs.where.createdAt.lt).toBeInstanceOf(Date);
  });
});
