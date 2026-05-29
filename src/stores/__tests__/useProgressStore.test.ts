import apiClient from '@/services/api/client';
import type { ActivityProgress } from '@/utils/types';
import { useProgressStore } from '../useProgressStore';

jest.mock('@/services/api/client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

const mockPost = apiClient.post as jest.Mock;

const makeQueueItem = (overrides = {}) => ({
  type: 'saveProgress' as const,
  endpoint: '/v1/progress/prof-1/act-1',
  payload: { displayText: 'cat', isCorrect: true },
  headers: { 'X-Idempotency-Key': 'test-key' },
  ...overrides,
});

describe('useProgressStore — offline queue', () => {
  beforeEach(() => {
    useProgressStore.setState({
      activities: [],
      streakDays: 0,
      isLoading: false,
      lastInvalidatedAt: 0,
      offlineQueue: [],
      isSyncing: false,
      activityLog: {},
    });
    jest.clearAllMocks();
  });

  it('starts with an empty offline queue', () => {
    expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
  });

  it('addToQueue appends an item with id, createdAt, and retryCount=0', () => {
    useProgressStore.getState().addToQueue(makeQueueItem());
    const queue = useProgressStore.getState().offlineQueue;
    expect(queue).toHaveLength(1);
    expect(queue[0].retryCount).toBe(0);
    expect(typeof queue[0].id).toBe('string');
    expect(queue[0].id.length).toBeGreaterThan(0);
    expect(typeof queue[0].createdAt).toBe('number');
  });

  it('addToQueue appends multiple items', () => {
    useProgressStore.getState().addToQueue(makeQueueItem({ endpoint: '/a' }));
    useProgressStore.getState().addToQueue(makeQueueItem({ endpoint: '/b' }));
    expect(useProgressStore.getState().offlineQueue).toHaveLength(2);
  });

  it('removeFromQueue removes an item by id', () => {
    useProgressStore.getState().addToQueue(makeQueueItem());
    const id = useProgressStore.getState().offlineQueue[0].id;
    useProgressStore.getState().removeFromQueue(id);
    expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
  });

  it('clearQueue empties all items', () => {
    useProgressStore.getState().addToQueue(makeQueueItem());
    useProgressStore.getState().addToQueue(makeQueueItem());
    useProgressStore.getState().clearQueue();
    expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
  });

  describe('drainQueue', () => {
    it('calls API for each queued item and removes on success', async () => {
      mockPost.mockResolvedValue({ data: {} });
      useProgressStore.getState().addToQueue(makeQueueItem({ endpoint: '/v1/progress/p/a' }));
      useProgressStore.getState().addToQueue(makeQueueItem({ endpoint: '/v1/progress/p/b' }));

      await useProgressStore.getState().drainQueue();

      expect(mockPost).toHaveBeenCalledTimes(2);
      expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
    });

    it('removes item on 409 conflict', async () => {
      const conflictError = { response: { status: 409 } };
      mockPost.mockRejectedValueOnce(conflictError);
      useProgressStore.getState().addToQueue(makeQueueItem());

      await useProgressStore.getState().drainQueue();

      expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
    });

    it('increments retryCount on failure (non-409)', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));
      useProgressStore.getState().addToQueue(makeQueueItem());

      await useProgressStore.getState().drainQueue();

      expect(useProgressStore.getState().offlineQueue[0].retryCount).toBe(1);
    });

    it('removes item after MAX_RETRIES (5) consecutive failures', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));
      useProgressStore.getState().addToQueue(makeQueueItem());

      for (let i = 0; i < 5; i++) {
        await useProgressStore.getState().drainQueue();
        useProgressStore.setState({ isSyncing: false });
      }

      expect(useProgressStore.getState().offlineQueue).toHaveLength(0);
    });

    it('does not drain if already syncing', async () => {
      mockPost.mockResolvedValue({ data: {} });
      useProgressStore.getState().addToQueue(makeQueueItem());
      useProgressStore.setState({ isSyncing: true });

      await useProgressStore.getState().drainQueue();

      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('clears activities and streak and updates lastInvalidatedAt', () => {
      useProgressStore.setState({ activities: [{ id: '1' } as ActivityProgress], streakDays: 5 });
      const before = Date.now();
      useProgressStore.getState().invalidate();
      const after = Date.now();
      const state = useProgressStore.getState();
      expect(state.activities).toHaveLength(0);
      expect(state.streakDays).toBe(0);
      expect(state.lastInvalidatedAt).toBeGreaterThanOrEqual(before);
      expect(state.lastInvalidatedAt).toBeLessThanOrEqual(after);
    });

    it('does not clear the on-device activity log', () => {
      useProgressStore
        .getState()
        .recordLocalActivity('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      useProgressStore.getState().invalidate();
      expect(useProgressStore.getState().activityLog['prof-1']['cat']).toBeDefined();
    });
  });

  describe('recordLocalActivity', () => {
    it('creates a per-profile entry with the correct date on a correct attempt', () => {
      useProgressStore
        .getState()
        .recordLocalActivity('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      const entry = useProgressStore.getState().activityLog['prof-1']['cat'];
      expect(entry).toEqual({
        id: 'cat',
        displayText: 'cat',
        correctDates: ['2026-05-29'],
        lastDate: '2026-05-29',
        lastIsCorrect: true,
      });
    });

    it('does not add a correct date for an incorrect attempt but updates lastDate', () => {
      useProgressStore
        .getState()
        .recordLocalActivity('prof-1', { id: 'cat', displayText: 'cat', isCorrect: false }, '2026-05-29');
      const entry = useProgressStore.getState().activityLog['prof-1']['cat'];
      expect(entry.correctDates).toEqual([]);
      expect(entry.lastDate).toBe('2026-05-29');
      expect(entry.lastIsCorrect).toBe(false);
    });

    it('dedupes the same correct date but accumulates distinct days', () => {
      const rec = useProgressStore.getState().recordLocalActivity;
      rec('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      rec('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      rec('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-30');
      expect(useProgressStore.getState().activityLog['prof-1']['cat'].correctDates).toEqual([
        '2026-05-29',
        '2026-05-30',
      ]);
    });

    it('keeps separate logs per profile', () => {
      const rec = useProgressStore.getState().recordLocalActivity;
      rec('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      rec('prof-2', { id: 'dog', displayText: 'dog', isCorrect: true }, '2026-05-29');
      const log = useProgressStore.getState().activityLog;
      expect(Object.keys(log['prof-1'])).toEqual(['cat']);
      expect(Object.keys(log['prof-2'])).toEqual(['dog']);
    });

    it('ignores calls without a profileId or activity id', () => {
      const rec = useProgressStore.getState().recordLocalActivity;
      rec('', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      rec('prof-1', { id: '', displayText: '', isCorrect: true }, '2026-05-29');
      expect(useProgressStore.getState().activityLog).toEqual({});
    });
  });

  describe('mergeServerActivities', () => {
    it('seeds the local log from a server response (correct activity adds its date)', () => {
      useProgressStore.getState().mergeServerActivities('prof-1', [
        {
          id: 'cat',
          displayText: 'cat',
          isCorrect: true,
          daysCorrect: 2,
          mastered: false,
          lastDate: '2026-05-28T10:00:00.000Z',
        },
      ]);
      const entry = useProgressStore.getState().activityLog['prof-1']['cat'];
      expect(entry.correctDates).toEqual(['2026-05-28']);
      expect(entry.lastDate).toBe('2026-05-28');
      expect(entry.lastIsCorrect).toBe(true);
    });

    it('merges without dropping locally-known correct dates', () => {
      useProgressStore
        .getState()
        .recordLocalActivity('prof-1', { id: 'cat', displayText: 'cat', isCorrect: true }, '2026-05-29');
      useProgressStore.getState().mergeServerActivities('prof-1', [
        { id: 'cat', displayText: 'cat', isCorrect: true, daysCorrect: 1, mastered: false, lastDate: '2026-05-28' },
      ]);
      expect(
        useProgressStore.getState().activityLog['prof-1']['cat'].correctDates.sort(),
      ).toEqual(['2026-05-28', '2026-05-29']);
    });

    it('is a no-op for an empty activities array', () => {
      useProgressStore.getState().mergeServerActivities('prof-1', []);
      expect(useProgressStore.getState().activityLog).toEqual({});
    });
  });
});
