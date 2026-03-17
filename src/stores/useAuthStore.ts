import { create } from 'zustand';

interface AuthStore {
  isSignedIn: boolean;
  userId: string | null;
  token: string | null;
  setAuth: (userId: string, token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  isSignedIn: false,
  userId: null,
  token: null,
  setAuth: (userId, token) => set({ isSignedIn: true, userId, token }),
  clearAuth: () => set({ isSignedIn: false, userId: null, token: null }),
}));
