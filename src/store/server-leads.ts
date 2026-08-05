import { create } from 'zustand';
import type { Lead } from '../db/leads.repo';
import { fetchServerLeads } from '../lib/server-leads';

interface ServerLeadsState {
  leads: Lead[];
  loading: boolean;
  /** true once at least one fetch failed and nothing is cached */
  error: boolean;
  refresh: () => Promise<void>;
}

export const useServerLeads = create<ServerLeadsState>((set, get) => ({
  leads: [],
  loading: false,
  error: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    const rows = await fetchServerLeads();
    if (rows === null) {
      set({ loading: false, error: get().leads.length === 0 });
    } else {
      set({ leads: rows, loading: false, error: false });
    }
  },
}));
