import { GoogleGenAI } from '@google/genai';

export class EmbeddingService {
  private ai: GoogleGenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Embeddings will fail or use default behavior.');
    }
    
    // The @google/genai SDK automatically picks up GEMINI_API_KEY from process.env if not explicitly passed
    this.ai = new GoogleGenAI({ apiKey: apiKey || 'dummy_key' });
    this.model = process.env.EMBEDDING_MODEL || 'gemini-embedding-2';
  }

  /**
   * Generate an embedding for a single string.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: text,
        config: {
          outputDimensionality: 768
        }
      });

      if (response.embeddings && response.embeddings.length > 0 && response.embeddings[0].values) {
        return response.embeddings[0].values;
      }
      throw new Error("No embedding values returned");
      throw new Error('No embedding returned from API');
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple chunks.
   * Processes sequentially to avoid aggressive rate limits on free tiers.
   */
  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];
    
    // Process in batches or sequentially
    for (const chunk of chunks) {
      const embedding = await this.generateEmbedding(chunk);
      embeddings.push(embedding);
    }
    
    return embeddings;
  }
}
