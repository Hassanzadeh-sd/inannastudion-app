import { create } from 'zustand';

/**
 * Cheap cross-screen invalidation: any write to the leads table bumps the
 * version; list/detail screens re-query when it changes.
 */
interface LeadsVersionState {
  version: number;
  bump: () => void;
}

export const useLeadsVersion = create<LeadsVersionState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 })),
}));

export const bumpLeadsVersion = () => useLeadsVersion.getState().bump();
