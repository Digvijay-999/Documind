import prisma from '../utils/prisma';

export class UsageService {
  /**
   * Log AI token usage asynchronously
   */
  static async recordUsage(data: {
    userId: string;
    documentId: string;
    provider?: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    latencyMs: number;
  }) {
    try {
      // Basic estimated cost calculation based on model
      let inputCostPerM = 0;
      let outputCostPerM = 0;

      const provider = data.provider || 'gemini';

      if (provider === 'groq') {
        if (data.model.includes('llama-3.3-70b-versatile')) {
          inputCostPerM = 0.59;
          outputCostPerM = 0.79;
        } else if (data.model.includes('llama3-8b-8192') || data.model.includes('llama-3.1-8b')) {
          inputCostPerM = 0.05;
          outputCostPerM = 0.08;
        } else {
          // generic default
          inputCostPerM = 0.50;
          outputCostPerM = 0.50;
        }
      } else {
        // gemini 2.5 flash fallback
        inputCostPerM = 0.075;
        outputCostPerM = 0.30;
      }

      const estimatedCost = (data.inputTokens * (inputCostPerM / 1000000)) + (data.outputTokens * (outputCostPerM / 1000000));

      await prisma.aIUsage.create({
        data: {
          userId: data.userId,
          documentId: data.documentId,
          provider: provider,
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
