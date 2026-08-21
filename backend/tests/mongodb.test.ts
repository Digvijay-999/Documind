import { ChatSession } from '../src/models/ChatSession';
import { getChatStats } from '../src/controllers/admin.controller';
import { Response } from 'express';
import { AuthRequest } from '../src/middleware/authMiddleware';

jest.mock('../src/models/ChatSession');

describe('MongoDB ChatSession Model & Aggregations', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a chat session', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    (ChatSession.findOneAndUpdate as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      documentId: 'doc-1',
      messages: [],
      save: mockSave,
    });

    const session = await ChatSession.findOneAndUpdate(
      { userId: 'user-1', documentId: 'doc-1' },
      { $setOnInsert: { userId: 'user-1', documentId: 'doc-1' } },
      { upsert: true, new: true }
    );

    expect(session.userId).toBe('user-1');
    expect(ChatSession.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: 'user-1', documentId: 'doc-1' },
      { $setOnInsert: { userId: 'user-1', documentId: 'doc-1' } },
      { upsert: true, new: true }
    );
  });

  it('should persist a message', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    const mockSession = {
      userId: 'user-1',
      documentId: 'doc-1',
      messages: [],
      save: mockSave,
    };

    (ChatSession.findOneAndUpdate as jest.Mock).mockResolvedValue(mockSession);

    const session = await ChatSession.findOneAndUpdate();
    session!.messages.push({ role: 'user', content: 'hello', createdAt: new Date() });
    await session!.save();

    expect(session!.messages.length).toBe(1);
    expect(session!.messages[0].role).toBe('user');
    expect(session!.messages[0].content).toBe('hello');
    expect(mockSave).toHaveBeenCalled();
  });

  it('should retrieve chat history for specific user and document', async () => {
    (ChatSession.findOne as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      documentId: 'doc-1',
      messages: [{ role: 'assistant', content: 'hi' }],
    });

    const session = await ChatSession.findOne({ userId: 'user-1', documentId: 'doc-1' });
    expect(session?.messages[0].content).toBe('hi');
  });

  it('should execute MongoDB aggregation pipeline for admin chat stats ($match, $group, $sort)', async () => {
    const mockAggregatedData = [
      {
        _id: 'doc-1',
        totalSessions: 3,
        totalMessages: 12,
        lastInteraction: new Date('2026-08-20T10:00:00Z'),
      },
      {
        _id: 'doc-2',
        totalSessions: 1,
        totalMessages: 4,
        lastInteraction: new Date('2026-08-20T11:00:00Z'),
      },
    ];

    (ChatSession.aggregate as jest.Mock).mockResolvedValue(mockAggregatedData);

    const mockReq: Partial<AuthRequest> = {
      user: { id: 'admin-uuid', role: 'ADMIN' },
    };

    let statusCode = 0;
    let responseBody: any = null;

    const mockRes: Partial<Response> = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockRes;
      }),
      json: jest.fn().mockImplementation((body: any) => {
        responseBody = body;
        return mockRes;
      }),
    };

    await getChatStats(mockReq as AuthRequest, mockRes as Response);

    expect(statusCode).toBe(200);
    expect(responseBody.success).toBe(true);
    expect(responseBody.data).toHaveLength(2);
    expect(responseBody.data[0].documentId).toBe('doc-1');
    expect(responseBody.data[0].totalMessages).toBe(12);
    expect(ChatSession.aggregate).toHaveBeenCalledWith([
      { $match: { 'messages.0': { $exists: true } } },
      {
        $group: {
          _id: '$documentId',
          totalSessions: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          lastInteraction: { $max: '$updatedAt' },
        },
      },
      { $sort: { totalMessages: -1 } },
    ]);
  });
});
