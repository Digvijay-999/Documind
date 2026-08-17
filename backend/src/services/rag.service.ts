import { EmbeddingService } from './embedding.service';
import { VectorService } from './vector.service';

export interface RetrievedChunk {
  text: string;
  chunkIndex: number;
  score: number;
}

export class RagService {
  private embeddingService: EmbeddingService;
  private vectorService: VectorService;

  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorService = new VectorService();
  }

  /**
   * Search for chunks relevant to a query inside a specific document.
   */
  async retrieveRelevantChunks(documentId: string, query: string, topK: number = 5): Promise<RetrievedChunk[]> {
    if (!query || query.trim() === '') {
      throw new Error('Query cannot be empty');
    }

    // 1. Generate an embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding(query);

    // 2. Perform similarity search in ChromaDB
    const results = await this.vectorService.queryDocument(documentId, queryEmbedding, topK);

    const retrievedChunks: RetrievedChunk[] = [];

    // ChromaDB returns nested arrays because you can query multiple embeddings at once
    if (results.documents && results.documents[0] && results.metadatas && results.metadatas[0]) {
      const documents = results.documents[0];
      const metadatas = results.metadatas[0];
      const distances = results.distances ? results.distances[0] : [];

      for (let i = 0; i < documents.length; i++) {
        const text = documents[i];
        const metadata = metadatas[i] as any;
        const distance = distances[i] || 0;

        if (text) {
          retrievedChunks.push({
            text,
            chunkIndex: metadata?.chunkIndex ?? -1,
            // Cosine distance: smaller means closer. Convert distance to a similarity score (approx)
            score: 1 - distance,
          });
        }
      }
    }

    return retrievedChunks;
  }
}
