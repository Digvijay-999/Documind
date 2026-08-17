import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

async function run() {
  try {
    const c = await client.getOrCreateCollection({
      name: 'test_collection',
      embeddingFunction: { generate: async (texts: string[]) => [] }
    });
    console.log('Collection created successfully with dummy embedder');
  } catch (err) {
    console.error('Error creating collection:', err);
  }
}

run().catch(console.error);
