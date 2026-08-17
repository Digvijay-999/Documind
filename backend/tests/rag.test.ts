import request from 'supertest';
import app from '../src/server';
import prisma from '../src/utils/prisma';
import fs from 'fs';
import path from 'path';

const MINIMAL_PDF_BASE64 = 'JVBERi0xLjQKMSAwIG9iaiA8PC9UeXBlIC9DYXRhbG9nIC9QYWdlcyAyIDAgUj4+IGVuZG9iaiAyIDAgb2JqIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmogMyAwIG9iaiA8PC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgMTAwIDEwMF0+PiBlbmRvYmogeHJlZiAwIDQgMDAwMDAwMDAwMCA2NTUzNSBmIA0KMDAwMDAwMDAwOSAwMDAwMCBuIA0KMDAwMDAwMDU2IDAwMDAwIG4gDQowMDAwMDAwMTExIDAwMDAwIG4gDQp0cmFpbGVyIDw8L1NpemUgNCAvUm9vdCAxIDAgUj4+IHN0YXJ0eHJlZiAxODkgJSVFT0Y=';

jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({ text: 'Mocked extracted text for normalization' });
});

// Mock the services before they are imported in controllers
jest.mock('../src/services/embedding.service', () => {
  return {
    EmbeddingService: jest.fn().mockImplementation(() => {
      return {
        generateEmbedding: jest.fn().mockResolvedValue(Array(768).fill(0.1)),
        generateEmbeddings: jest.fn().mockResolvedValue([Array(768).fill(0.1)]),
      };
    }),
  };
});

jest.mock('../src/services/vector.service', () => {
  return {
    VectorService: jest.fn().mockImplementation(() => {
      return {
        addChunks: jest.fn().mockResolvedValue(undefined),
        deleteDocument: jest.fn().mockResolvedValue(undefined),
        queryDocument: jest.fn().mockResolvedValue({
          documents: [['Mocked chunk text for normalization']],
          metadatas: [[{ chunkIndex: 0 }]],
          distances: [[0.123]]
        }),
      };
    }),
  };
});

describe('RAG Pipeline & Search Endpoints', () => {
  let userToken: string;
  let otherUserToken: string;
  let documentId: string;
  const testPdfPath = path.join(__dirname, 'test_rag.pdf');

  beforeAll(async () => {
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();

    fs.writeFileSync(testPdfPath, Buffer.from(MINIMAL_PDF_BASE64, 'base64'));

    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    await prisma.user.create({ data: { name: 'RAG User', email: 'rag@example.com', passwordHash } });
    await prisma.user.create({ data: { name: 'Other User', email: 'other@example.com', passwordHash } });

    const res1 = await request(app).post('/api/auth/login').send({ email: 'rag@example.com', password: 'password123' });
    userToken = res1.body.token;

    const res2 = await request(app).post('/api/auth/login').send({ email: 'other@example.com', password: 'password123' });
    otherUserToken = res2.body.token;
  });

  afterAll(async () => {
    await prisma.document.deleteMany();
    await prisma.user.deleteMany();
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
  });

  it('1. Uploading document triggers chunking and mocked embeddings', async () => {
    const res = await request(app)
      .post('/api/documents')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', testPdfPath);
      
    expect(res.statusCode).toBe(201);
    documentId = res.body.data.id;

    // Wait for background processing
    await new Promise(r => setTimeout(r, 500));

    // Check if it reached READY state (pipeline success)
    const docRes = await request(app).get(`/api/documents/${documentId}`).set('Authorization', `Bearer ${userToken}`);
    expect(docRes.body.data.status).toBe('READY');
  });

  it('2. Empty query is rejected', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/search`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: '' });
      
    expect(res.statusCode).toBe(400);
  });

  it('3. Search requires authentication', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/search`)
      .send({ query: 'test' });
      
    expect(res.statusCode).toBe(401);
  });

  it('4. User cannot search another user\'s document', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/search`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({ query: 'normalization' });
      
    expect(res.statusCode).toBe(404);
  });

  it('5. Search returns relevant mocked chunks', async () => {
    const res = await request(app)
      .post(`/api/documents/${documentId}/search`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ query: 'normalization' });
      
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].text).toContain('Mocked chunk');
  });
});
