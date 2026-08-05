import { create } from 'zustand';

/** Staff session auto-relocks after this much inactivity. */
export const RELOCK_AFTER_MS = 10 * 60 * 1000;
export const PIN_MAX_FAILS = 5;
export const PIN_COOLDOWN_MS = 60 * 1000;

interface SessionState {
  unlocked: boolean;
  lastActivity: number;
  pinFails: number;
  pinCooldownUntil: number;
  unlock: () => void;
  lock: () => void;
  touch: () => void;
  registerPinFail: () => void;
  resetPinFails: () => void;
}

export const useSession = create<SessionState>((set) => ({
  unlocked: false,
  lastActivity: 0,
  pinFails: 0,
  pinCooldownUntil: 0,
  unlock: () =>
    set({ unlocked: true, lastActivity: Date.now(), pinFails: 0, pinCooldownUntil: 0 }),
  lock: () => set({ unlocked: false }),
  touch: () => set({ lastActivity: Date.now() }),
  registerPinFail: () =>
    set((s) => {
      const fails = s.pinFails + 1;
      return fails >= PIN_MAX_FAILS
        ? { pinFails: 0, pinCooldownUntil: Date.now() + PIN_COOLDOWN_MS }
        : { pinFails: fails };
    }),
  resetPinFails: () => set({ pinFails: 0, pinCooldownUntil: 0 }),
}));
