import { ChromaClient } from 'chromadb';

const client = new ChromaClient({ path: 'http://localhost:8000' });

async function clearCollection() {
  try {
    await client.deleteCollection({ name: 'documind_documents' });
    console.log('Collection documind_documents deleted successfully.');
  } catch (err: any) {
    console.log('Collection might not exist or could not be deleted:', err.message);
  }
}

clearCollection().catch(console.error);
