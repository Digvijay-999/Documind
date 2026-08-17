import prisma from '../utils/prisma';

export class UsageService {
  /**
   * Log AI token usage asynchronously
   */
  static async recordUsage(data: {
    userId: string;
    documentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
  }) {
    try {
      // Very basic estimated cost calculation.
      // Example Gemini 2.5 flash: ~$0.075 / 1M input tokens, ~$0.30 / 1M output tokens
      const estimatedCost = (data.inputTokens * 0.000000075) + (data.outputTokens * 0.00000030);

      await prisma.aIUsage.create({
        data: {
          userId: data.userId,
          documentId: data.documentId,
          model: data.model,
          inputTokens: data.inputTokens,
          outputTokens: data.outputTokens,
          totalTokens: data.totalTokens,
          latencyMs: data.latencyMs,
          estimatedCost: estimatedCost
        }
      });
      console.log(`Recorded usage for user ${data.userId}: ${data.totalTokens} tokens (${data.latencyMs}ms)`);
    } catch (error) {
      console.error('Failed to record AI usage:', error);
    }
  }
}
