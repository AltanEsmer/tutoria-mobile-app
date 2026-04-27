import { getProgress, saveProgress } from '../progress';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../idempotency', () => ({
  makeIdempotencyKey: jest.fn(() => 'mock-idempotency-key'),
}));

import apiClient from '../client';

const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;

describe('getProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls GET /v1/progress/:profileId and returns data', async () => {
    const mockData = { activities: [], streakDays: 5, items: {} };
    mockGet.mockResolvedValueOnce({ data: mockData });

    const result = await getProgress('profile-123');

    expect(mockGet).toHaveBeenCalledWith('/v1/progress/profile-123');
    expect(result).toEqual(mockData);
  });

  it('propagates errors from the API client', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network error'));
    await expect(getProgress('profile-123')).rejects.toThrow('Network error');
  });
});

describe('saveProgress', () => {
  beforeEach(() => jest.clearAllMocks());

  it('posts to the correct URL with an idempotency key', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });
    const req = { displayText: 'cat', isCorrect: true };

    await saveProgress('profile-1', 'activity-1', req);

    expect(mockPost).toHaveBeenCalledWith('/v1/progress/profile-1/activity-1', req, {
      headers: { 'X-Idempotency-Key': 'mock-idempotency-key' },
    });
  });

  it('skips the call when activityId is empty', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await saveProgress('profile-1', '  ', { displayText: 'cat', isCorrect: true });
    expect(mockPost).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('skips the call when displayText is empty', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await saveProgress('profile-1', 'activity-1', { displayText: '  ', isCorrect: true });
    expect(mockPost).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('URL-encodes the activityId', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });
    const req = { displayText: 'cat', isCorrect: true };
    await saveProgress('p-1', 'cat/activity', req);
    expect(mockPost).toHaveBeenCalledWith(
      '/v1/progress/p-1/cat%2Factivity',
      req,
      expect.any(Object),
    );
  });
});
