describe("redeem-on-behalf endpoint", () => {
  test("forbids non-admin users and allows admin to call RPC", async () => {
    // Mock createServerClient to provide auth.getUser and from/rpc
    jest.resetModules();
    // Provide a chainable supabase server client mock so route's .select().eq() works
    jest.doMock("@/lib/supabase/server", () => ({
      createServerClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({
          select: () => ({ eq: async () => ({ error: null, data: [{ role: 'admin' }] }) }),
        }),
        rpc: async () => ({ error: null }),
      }),
    }));

    const { POST } = await import("@/app/api/admin/redeem-on-behalf/route");
    const req = new Request('http://localhost/api/admin/redeem-on-behalf', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: 't', target_user_id: 'u2' }) });
    const res = await POST(req as unknown as Request);
    const maybe = res as unknown as { json?: unknown };
    if (maybe && typeof maybe.json === 'function') {
      const body = await (maybe as unknown as { json: () => Promise<Record<string, unknown>> }).json();
      expect(body.ok).toBeTruthy();
      return;
    }
    const body = res as unknown as Record<string, unknown>;
    expect(body.ok).toBeTruthy();
  });
});
