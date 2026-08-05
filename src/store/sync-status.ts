import { create } from 'zustand';

export type SyncPhase = 'idle' | 'syncing' | 'ok' | 'error' | 'unconfigured';

interface SyncStatusState {
  phase: SyncPhase;
  pendingCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  set: (patch: Partial<Omit<SyncStatusState, 'set'>>) => void;
}

export const useSyncStatus = create<SyncStatusState>((set) => ({
  phase: 'idle',
  pendingCount: 0,
  lastSyncAt: null,
  lastError: null,
  set: (patch) => set(patch),
}));
