import { ChromaClient, Collection } from 'chromadb';

export interface VectorMetadata {
  documentId: string;
  chunkIndex: number;
  originalFileName?: string;
  [key: string]: any;
}

export class VectorService {
  private client: ChromaClient;
  private collectionName = 'documind_documents';

  constructor() {
    const url = process.env.CHROMADB_URL || 'http://localhost:8000';
    this.client = new ChromaClient({ path: url });
  }

  private async getCollection(): Promise<Collection> {
    return await this.client.getOrCreateCollection({
      name: this.collectionName,
      // Optional: you can define distance function here, e.g. cosine
      metadata: { "hnsw:space": "cosine" }
    });
  }

  /**
   * Store document chunks and their embeddings in ChromaDB.
   */
  async addChunks(
    documentId: string, 
    chunks: string[], 
    embeddings: number[][], 
    metadatas: VectorMetadata[]
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      const ids = chunks.map((_, i) => `${documentId}_${i}`);

      await collection.add({
        ids: ids,
        embeddings: embeddings,
        metadatas: metadatas as any,
        documents: chunks,
      });

      console.log(`Stored ${chunks.length} vectors for document ${documentId}`);
    } catch (error) {
      console.error('Failed to add chunks to ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Search for similar chunks based on a query embedding.
   * Filters by documentId to ensure data isolation.
   */
  async queryDocument(documentId: string, queryEmbedding: number[], topK: number = 5) {
    try {
      const collection = await this.getCollection();
      
      const results = await collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: topK,
        where: { documentId: documentId } // Filter by documentId
      });

      return results;
    } catch (error) {
      console.error('Failed to query ChromaDB:', error);
      throw error;
    }
  }

  /**
   * Remove all vectors associated with a document.
   */
  async deleteDocument(documentId: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      
      await collection.delete({
        where: { documentId: documentId }
      });
      
      console.log(`Deleted vectors for document ${documentId}`);
    } catch (error) {
      console.error('Failed to delete document from ChromaDB:', error);
      // We don't throw here to avoid blocking physical file deletion if Chroma is down
    }
  }
}
