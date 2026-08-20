import request from 'supertest';
import app from '../src/server';
import { ChatSession } from '../src/models/ChatSession';
import prisma from '../src/utils/prisma';
import jwt from 'jsonwebtoken';

jest.mock('../src/models/ChatSession');
jest.mock('../src/utils/prisma', () => ({
  document: {
    findUnique: jest.fn()
  }
}));

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_development';

describe('Chat API', () => {
  const userId = 'user-uuid-123';
  const otherUserId = 'other-user-uuid';
  const documentId = 'doc-uuid-123';
  const validToken = jwt.sign({ id: userId }, JWT_SECRET);
  const invalidToken = jwt.sign({ id: userId }, 'wrong-secret');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('1. Valid JWT + existing history -> 200', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: documentId, userId });
    (ChatSession.findOne as jest.Mock).mockResolvedValue({
      messages: [{ role: 'user', content: 'hello' }]
    });

    const res = await request(app)
      .get(`/api/chat/sessions/${documentId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].content).toBe('hello');
  });

  it('2. Valid JWT + no history -> 200 with []', async () => {
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: documentId, userId });
    (ChatSession.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .get(`/api/chat/sessions/${documentId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
  });

  it('3. Missing JWT -> 401', async () => {
    const res = await request(app)
      .get(`/api/chat/sessions/${documentId}`);

    expect(res.status).toBe(401);
  });

  it('4. Invalid JWT -> 401', async () => {
    const res = await request(app)
      .get(`/api/chat/sessions/${documentId}`)
      .set('Authorization', `Bearer ${invalidToken}`);

    expect(res.status).toBe(401);
  });

  it('5. User accessing another user\'s document -> 404', async () => {
    // Document belongs to otherUserId, not userId
    (prisma.document.findUnique as jest.Mock).mockResolvedValue({ id: documentId, userId: otherUserId });

    const res = await request(app)
      .get(`/api/chat/sessions/${documentId}`)
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
  });
});
