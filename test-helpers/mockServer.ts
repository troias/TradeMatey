// Minimal test helpers for mocking global fetch and supabase server client
export function mockFetch(jsonResponse: unknown, ok = true) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).fetch = jest.fn(async () => ({ ok, json: async () => jsonResponse }));
}

export function restoreFetch() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const f = (global as any).fetch;
  if (f && typeof f.mockRestore === 'function') f.mockRestore();
}

export function mockSupabaseClient() {
  // provide a createServerClient replacement in the lib path used by routes
  jest.doMock('@/lib/supabase/server', () => ({
    createServerClient: () => ({
      from: () => ({
        insert: async (v: unknown) => ({ data: v, error: null }),
        update: async (v: unknown) => ({ data: v, error: null }),
        select: async () => ({ data: [], error: null }),
        eq: () => ({ data: [], error: null }),
      }),
      auth: { getUser: async () => ({ data: { user: { id: 'test-user', email: 'test@example.com' } } }) },
      rpc: async () => ({ data: null, error: null }),
    }),
  }));
}
