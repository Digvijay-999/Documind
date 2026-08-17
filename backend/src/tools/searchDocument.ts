import { RagService } from '../services/rag.service';
import prisma from '../utils/prisma';
import { Type, FunctionDeclaration } from '@google/genai';

export const searchDocumentDeclaration: FunctionDeclaration = {
  name: 'searchDocument',
  description: 'Search the document for relevant information based on a specific query. Returns matching text chunks from the document.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: {
        type: Type.STRING,
        description: 'The search query to find in the document.'
      }
    },
    required: ['query']
  }
};

export async function executeSearchDocument(userId: string, documentId: string, args: any) {
  if (!args.query) {
    throw new Error('searchDocument requires a query');
  }

  // Double check authorization to be safe
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc || doc.userId !== userId) {
    throw new Error('Unauthorized or Document not found');
  }

  const ragService = new RagService();
  const chunks = await ragService.retrieveRelevantChunks(documentId, args.query, 5);

  if (chunks.length === 0) {
    return { result: "No relevant information found in the document for that query." };
  }

  // Format the returned chunks so the LLM can read them
  return {
    result: "Found relevant chunks.",
    chunks: chunks.map(c => `[Chunk ${c.chunkIndex}]: ${c.text}`)
  };
}
