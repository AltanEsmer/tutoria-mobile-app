import type { NfcTagPayload } from '../../utils/types';
import { useNfcStore } from '../useNfcStore';

const mockTag: NfcTagPayload = {
  tagId: 'tag-001',
  moduleId: 'module-phonics-1',
  isValid: true,
  rawData: 'tutoria:module-phonics-1',
};

describe('useNfcStore', () => {
  beforeEach(() => {
    useNfcStore.setState({
      isScanning: false,
      isSupported: false,
      isEnabled: false,
      lastTag: null,
      error: null,
      scanState: 'idle',
    });
  });

  it('has correct initial state', () => {
    const state = useNfcStore.getState();
    expect(state.isScanning).toBe(false);
    expect(state.isSupported).toBe(false);
    expect(state.isEnabled).toBe(false);
    expect(state.lastTag).toBeNull();
    expect(state.error).toBeNull();
    expect(state.scanState).toBe('idle');
  });

  it('setScanning transitions idle → scanning', () => {
    useNfcStore.getState().setScanning(true);
    expect(useNfcStore.getState().isScanning).toBe(true);
  });

  it('setSupported marks NFC as supported', () => {
    useNfcStore.getState().setSupported(true);
    expect(useNfcStore.getState().isSupported).toBe(true);
  });

  it('setEnabled marks NFC as enabled', () => {
    useNfcStore.getState().setEnabled(true);
    expect(useNfcStore.getState().isEnabled).toBe(true);
  });

  it('setLastTag stores the scanned tag', () => {
    useNfcStore.getState().setLastTag(mockTag);
    expect(useNfcStore.getState().lastTag).toEqual(mockTag);
  });

  it('setError stores the error message', () => {
    useNfcStore.getState().setError('NFC unavailable');
    expect(useNfcStore.getState().error).toBe('NFC unavailable');
  });

  it('setLastTag(null) clears the tag', () => {
    useNfcStore.getState().setLastTag(mockTag);
    useNfcStore.getState().setLastTag(null);
    expect(useNfcStore.getState().lastTag).toBeNull();
  });

  it('scan lifecycle: idle → scanning → success', () => {
    const store = useNfcStore.getState();
    store.setScanning(true);
    expect(useNfcStore.getState().isScanning).toBe(true);

    useNfcStore.getState().setLastTag(mockTag);
    useNfcStore.getState().setScanning(false);

    const state = useNfcStore.getState();
    expect(state.isScanning).toBe(false);
    expect(state.lastTag).toEqual(mockTag);
  });

  it('scan lifecycle: idle → scanning → error', () => {
    useNfcStore.getState().setScanning(true);
    useNfcStore.getState().setError('Tag read failed');
    useNfcStore.getState().setScanning(false);

    const state = useNfcStore.getState();
    expect(state.isScanning).toBe(false);
    expect(state.error).toBe('Tag read failed');
    expect(state.lastTag).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scanState field
// ---------------------------------------------------------------------------

describe('useNfcStore — scanState', () => {
  beforeEach(() => {
    useNfcStore.setState({
      isScanning: false,
      isSupported: false,
      isEnabled: false,
      lastTag: null,
      error: null,
      scanState: 'idle',
    });
  });

  it('initial scanState is idle', () => {
    expect(useNfcStore.getState().scanState).toBe('idle');
  });

  it('setScanState(listening) updates only scanState and leaves other fields unchanged', () => {
    const before = useNfcStore.getState();
    useNfcStore.getState().setScanState('listening');
    const after = useNfcStore.getState();

    expect(after.scanState).toBe('listening');
    // All other fields must be unaffected
    expect(after.isScanning).toBe(before.isScanning);
    expect(after.isSupported).toBe(before.isSupported);
    expect(after.isEnabled).toBe(before.isEnabled);
    expect(after.lastTag).toBe(before.lastTag);
    expect(after.error).toBe(before.error);
  });
});
