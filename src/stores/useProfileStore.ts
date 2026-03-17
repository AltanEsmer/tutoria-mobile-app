import { create } from 'zustand';
import type { Profile } from '../utils/types';

interface ProfileStore {
  profiles: Profile[];
  activeProfile: Profile | null;
  setProfiles: (profiles: Profile[]) => void;
  setActiveProfile: (profile: Profile | null) => void;
  addProfile: (profile: Profile) => void;
}

export const useProfileStore = create<ProfileStore>((set) => ({
  profiles: [],
  activeProfile: null,
  setProfiles: (profiles) => set({ profiles }),
  setActiveProfile: (activeProfile) => set({ activeProfile }),
  addProfile: (profile) => set((state) => ({ profiles: [...state.profiles, profile] })),
}));
