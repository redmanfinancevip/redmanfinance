// src/lib/supabaseServer.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

let supabaseServer: any;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('Missing Supabase server configuration — exporting stub supabaseServer. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  // Minimal in-memory stub to allow local dev flows without Supabase configured.
  const _store: Record<string, any> = {};
  let _lastId = 0;
  supabaseServer = {
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: (tableName: string) => ({
      insert: async (payload: any) => {
        _lastId += 1;
        const id = `local-${Date.now()}-${_lastId}`;
        const row = { id, ...payload };
        _store[id] = row;
        return { data: row, error: null };
      },
      update: async (payload: any) => {
        // naive update: find first matching id in _store
        // If payload contains id, update that, otherwise no-op
        const id = payload?.id || Object.keys(_store)[0];
        if (id && _store[id]) {
          _store[id] = { ..._store[id], ...payload };
          return { data: _store[id], error: null };
        }
        return { data: null, error: { message: 'Not found' } };
      },
      select: async (sel?: any) => ({ data: Object.values(_store), error: null }),
      single: async () => ({ data: Object.values(_store)[0] ?? null, error: null }),
      eq: () => ({
        update: async (payload: any) => {
          // expect payload to include id, otherwise update first
          const id = payload?.id || Object.keys(_store)[0];
          if (id && _store[id]) {
            _store[id] = { ..._store[id], ...payload };
            return { data: _store[id], error: null };
          }
          return { data: null, error: { message: 'Not found' } };
        },
        select: async () => ({ data: Object.values(_store), error: null }),
        single: async () => ({ data: Object.values(_store)[0] ?? null, error: null }),
      }),
    }),
    storage: { from: () => ({ upload: async (_path: string, _file: any) => ({ error: null }) }) },
  };
} else {
  supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      // Server-side, no need for client-side session persistence
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export { supabaseServer };