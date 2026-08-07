import { create } from 'zustand';
import type { Lead } from '../db/leads.repo';
import { fetchServerLeads } from '../lib/server-leads';
import { markCustomersSeen } from '../lib/notify';

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
      // Viewing the fresh list counts as having seen everything in it.
      const newest = rows.reduce<string | null>(
        (m, r) => (m === null || r.created_at > m ? r.created_at : m),
        null,
      );
      void markCustomersSeen(newest);
    }
  },
}));
