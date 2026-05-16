// ---------------------------------------------------------------------------
// Mock the NFC service layer so tests never touch native modules
// ---------------------------------------------------------------------------

jest.mock('../../services/nfc', () => ({
  initNfc: jest.fn().mockResolvedValue(true),
  isNfcEnabled: jest.fn().mockResolvedValue(true),
  readTag: jest.fn(),
  cleanupNfc: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { readTag } from '../../services/nfc';
import { useNfcStore } from '../../stores/useNfcStore';
import { useNfc } from '../useNfc';

const mockReadTag = readTag as jest.MockedFunction<typeof readTag>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORE_RESET = {
  scanState: 'idle' as const,
  isScanning: false,
  isSupported: true,
  isEnabled: true,
  lastTag: null,
  error: null,
};

function resetStore() {
  useNfcStore.setState(STORE_RESET);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useNfc — scanState transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  it('initial scanState is idle', () => {
    const { result } = renderHook(() => useNfc());
    expect(result.current.scanState).toBe('idle');
  });

  it('successful scan: readTag resolves with isValid === true → scanState found', async () => {
    mockReadTag.mockResolvedValueOnce({ isValid: true, moduleId: 'module-a', tagId: 't' });

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('found');
    expect(result.current.error).toBeNull();
  });

  it('non-Tutoria card: readTag resolves with isValid === false → scanState not_tutoria_card, no error', async () => {
    mockReadTag.mockResolvedValueOnce({ isValid: false, moduleId: '', tagId: 't' });

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('not_tutoria_card');
    expect(result.current.error).toBeNull();
  });

  it('no NDEF message: readTag resolves to null → scanState parse_error, error set', async () => {
    mockReadTag.mockResolvedValueOnce(null);

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('parse_error');
    expect(result.current.error).toBeTruthy();
  });

  it('iOS user dismiss: readTag rejects with "Session invalidated by user" → scanState idle, no error', async () => {
    mockReadTag.mockRejectedValueOnce(new Error('Session invalidated by user'));

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('idle');
    expect(result.current.error).toBeNull();
  });

  it('iOS timeout: readTag rejects with "Session timeout" → scanState parse_error, error set', async () => {
    mockReadTag.mockRejectedValueOnce(new Error('Session timeout'));

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('parse_error');
    expect(result.current.error).toBe('Scan timed out — try again');
  });

  it('iOS app-invalidated: readTag rejects with "Session invalidated with error: not a Tutoria card" → scanState not_tutoria_card, no error', async () => {
    mockReadTag.mockRejectedValueOnce(
      new Error('Session invalidated with error: not a Tutoria card'),
    );

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('not_tutoria_card');
    expect(result.current.error).toBeNull();
  });

  it('generic / Android error: readTag rejects with "NFC chip reset" → scanState parse_error, error === message', async () => {
    mockReadTag.mockRejectedValueOnce(new Error('NFC chip reset'));

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('parse_error');
    expect(result.current.error).toBe('NFC chip reset');
  });

  it('re-scan after parse_error transitions through listening then to next outcome', async () => {
    // First scan → parse_error
    mockReadTag.mockRejectedValueOnce(new Error('NFC chip reset'));

    const { result } = renderHook(() => useNfc());

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('parse_error');

    // Second scan → success
    mockReadTag.mockResolvedValueOnce({ isValid: true, moduleId: 'module-b', tagId: 't2' });

    await act(async () => {
      await result.current.scan();
    });

    expect(result.current.scanState).toBe('found');
  });
});
