import { ChatSession } from '../src/models/ChatSession';

jest.mock('../src/models/ChatSession');

describe('MongoDB ChatSession Model', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a chat session', async () => {
    const mockSave = jest.fn().mockResolvedValue(true);
    (ChatSession.findOneAndUpdate as jest.Mock).mockResolvedValue({
      userId: 'user-1',
      documentId: 'doc-1',
      messages: [],
      save: mockSave
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
      save: mockSave
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
      messages: [{ role: 'assistant', content: 'hi' }]
    });

    const session = await ChatSession.findOne({ userId: 'user-1', documentId: 'doc-1' });
    expect(session?.messages[0].content).toBe('hi');
  });
});
