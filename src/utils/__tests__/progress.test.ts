import type { LocalActivityEntry } from '@/utils/types';
import { computeStreak, deriveActivities, toDateKey } from '../progress';

const entry = (over: Partial<LocalActivityEntry> & { id: string }): LocalActivityEntry => ({
  displayText: over.id,
  correctDates: [],
  lastDate: null,
  lastIsCorrect: false,
  ...over,
});

describe('toDateKey', () => {
  it('formats a Date as local YYYY-MM-DD with zero padding', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(toDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('deriveActivities', () => {
  it('returns an empty array for an empty log', () => {
    expect(deriveActivities({})).toEqual([]);
  });

  it('maps daysCorrect from distinct correct dates and applies the >=3 mastery rule', () => {
    const log = {
      cat: entry({
        id: 'cat',
        displayText: 'cat',
        correctDates: ['2026-05-27', '2026-05-28', '2026-05-29'],
        lastDate: '2026-05-29',
        lastIsCorrect: true,
      }),
      dog: entry({
        id: 'dog',
        displayText: 'dog',
        correctDates: ['2026-05-29'],
        lastDate: '2026-05-29',
        lastIsCorrect: true,
      }),
    };
    const result = deriveActivities(log);
    const cat = result.find((a) => a.id === 'cat')!;
    const dog = result.find((a) => a.id === 'dog')!;
    expect(cat.daysCorrect).toBe(3);
    expect(cat.mastered).toBe(true);
    expect(dog.daysCorrect).toBe(1);
    expect(dog.mastered).toBe(false);
  });

  it('reflects the last attempt verdict via isCorrect', () => {
    const log = {
      cat: entry({ id: 'cat', correctDates: ['2026-05-28'], lastDate: '2026-05-29', lastIsCorrect: false }),
    };
    expect(deriveActivities(log)[0].isCorrect).toBe(false);
  });

  it('falls back to id when displayText is empty', () => {
    const log = { cat: entry({ id: 'cat', displayText: '', lastDate: '2026-05-29' }) };
    expect(deriveActivities(log)[0].displayText).toBe('cat');
  });

  it('sorts most recently practiced first and sinks null dates to the end', () => {
    const log = {
      a: entry({ id: 'a', lastDate: '2026-05-27' }),
      b: entry({ id: 'b', lastDate: '2026-05-29' }),
      c: entry({ id: 'c', lastDate: null }),
    };
    expect(deriveActivities(log).map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('computeStreak', () => {
  const today = new Date(2026, 4, 29); // 2026-05-29

  it('returns 0 for an empty log', () => {
    expect(computeStreak({}, today)).toBe(0);
  });

  it('counts consecutive days anchored to today', () => {
    const log = {
      cat: entry({ id: 'cat', correctDates: ['2026-05-29', '2026-05-28', '2026-05-27'] }),
    };
    expect(computeStreak(log, today)).toBe(3);
  });

  it('counts a streak anchored to yesterday (today not yet practiced)', () => {
    const log = { cat: entry({ id: 'cat', correctDates: ['2026-05-28', '2026-05-27'] }) };
    expect(computeStreak(log, today)).toBe(2);
  });

  it('returns 0 when the most recent correct day is older than yesterday', () => {
    const log = { cat: entry({ id: 'cat', correctDates: ['2026-05-26', '2026-05-25'] }) };
    expect(computeStreak(log, today)).toBe(0);
  });

  it('stops counting at the first gap', () => {
    const log = {
      cat: entry({ id: 'cat', correctDates: ['2026-05-29', '2026-05-28'] }),
      dog: entry({ id: 'dog', correctDates: ['2026-05-25'] }),
    };
    expect(computeStreak(log, today)).toBe(2);
  });

  it('unions correct dates across multiple activities and dedupes', () => {
    const log = {
      cat: entry({ id: 'cat', correctDates: ['2026-05-29', '2026-05-28'] }),
      dog: entry({ id: 'dog', correctDates: ['2026-05-28', '2026-05-27'] }),
    };
    expect(computeStreak(log, today)).toBe(3);
  });
});
