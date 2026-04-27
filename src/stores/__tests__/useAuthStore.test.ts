import { useAuthStore } from '../useAuthStore';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ isSignedIn: false, userId: null, token: null });
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.isSignedIn).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.token).toBeNull();
  });

  it('setAuth updates state correctly', () => {
    useAuthStore.getState().setAuth('user-abc', 'tok-123');
    const state = useAuthStore.getState();
    expect(state.isSignedIn).toBe(true);
    expect(state.userId).toBe('user-abc');
    expect(state.token).toBe('tok-123');
  });

  it('clearAuth resets state to defaults', () => {
    useAuthStore.getState().setAuth('user-abc', 'tok-123');
    useAuthStore.getState().clearAuth();
    const state = useAuthStore.getState();
    expect(state.isSignedIn).toBe(false);
    expect(state.userId).toBeNull();
    expect(state.token).toBeNull();
  });

  it('setAuth can be called multiple times, last call wins', () => {
    useAuthStore.getState().setAuth('user-1', 'tok-1');
    useAuthStore.getState().setAuth('user-2', 'tok-2');
    expect(useAuthStore.getState().userId).toBe('user-2');
    expect(useAuthStore.getState().token).toBe('tok-2');
  });
});
