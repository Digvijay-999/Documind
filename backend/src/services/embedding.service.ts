export class EmbeddingService {
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://openrouter.ai/api/v1/embeddings';

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OPENROUTER_API_KEY is not set. Embeddings will fail.');
    }
    
    this.model = process.env.OPENROUTER_EMBEDDING_MODEL || 'nvidia/nemotron-3-embed-1b:free';
  }

  /**
   * Generate an embedding for a single string.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      console.log('Embedding provider: OpenRouter');
      console.log(`Embedding model: ${this.model}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'DocuMind AI'
        },
        body: JSON.stringify({
          model: this.model,
          input: text
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        (err as any).status = response.status;
        (err as any).details = errorText;
        throw err;
      }

      const data = await response.json();

      if (data && data.data && data.data.length > 0 && data.data[0].embedding) {
        return data.data[0].embedding;
      }
      
      throw new Error("No embedding values returned from OpenRouter");
    } catch (error) {
      console.error('Embedding generation failed:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple chunks.
   * OpenRouter API supports passing an array of strings to `input`.
   */
  async generateEmbeddings(chunks: string[]): Promise<number[][]> {
    if (chunks.length === 0) return [];
    
    try {
      console.log('Generating embeddings...');
      console.log('Embedding provider: OpenRouter');
      console.log(`Embedding model: ${this.model}`);
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'DocuMind AI'
        },
        body: JSON.stringify({
          model: this.model,
          input: chunks
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        const err = new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
        (err as any).status = response.status;
        (err as any).details = errorText;
        throw err;
      }

      const data = await response.json();

      if (data && data.data && data.data.length === chunks.length) {
        console.log(`Generated ${chunks.length} embeddings`);
        // Sort embeddings by index to match chunks order
        const sortedData = [...data.data].sort((a, b) => a.index - b.index);
        const firstEmbedding = sortedData[0].embedding;
        if (firstEmbedding) {
            console.log(`Vector dimension: ${firstEmbedding.length}`);
        }
        return sortedData.map(item => item.embedding);
      }
      
      throw new Error("Mismatch in embeddings returned from OpenRouter");
    } catch (error) {
      console.error('Batch embedding generation failed:', error instanceof Error ? error.message : error);
      throw error;
    }
  }
}
