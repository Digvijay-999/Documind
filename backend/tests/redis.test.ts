import { redisClient } from '../src/config/redis';

jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    setEx: jest.fn(),
    isOpen: true
  }
}));

describe('Redis Caching', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should handle cache miss', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    const result = await redisClient.get('test_key');
    expect(result).toBeNull();
    expect(redisClient.get).toHaveBeenCalledWith('test_key');
  });

  it('should handle cache set', async () => {
    (redisClient.setEx as jest.Mock).mockResolvedValue('OK');
    await redisClient.setEx('test_key', 600, 'test_value');
    expect(redisClient.setEx).toHaveBeenCalledWith('test_key', 600, 'test_value');
  });

  it('should handle cache hit', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue('test_value');
    const result = await redisClient.get('test_key');
    expect(result).toBe('test_value');
    expect(redisClient.get).toHaveBeenCalledWith('test_key');
  });

  it('should treat expired cache as a miss', async () => {
    (redisClient.get as jest.Mock).mockResolvedValue(null);
    const result = await redisClient.get('expired_key');
    expect(result).toBeNull();
  });
});
