import { mockFetch, mockSupabaseClient, restoreFetch } from '../../test-helpers/mockServer';

describe('disputes route', () => {
  beforeEach(() => {
    mockSupabaseClient();
  });

  afterEach(() => {
    restoreFetch();
    jest.resetModules();
  });

  it('module loads and exports POST', async () => {
    mockFetch({ id: '12345', portalId: '999' }, true);
    const route = await import('@/app/api/disputes/route');
    expect(route).toBeTruthy();
    expect(typeof route.POST === 'function').toBeTruthy();
  });

  it('returns 401 when unauthenticated', async () => {
    // Mock next runtime pieces to avoid Next.js runtime dependency in tests
    jest.doMock('next/server', () => ({
      NextResponse: { json: (body: unknown, opts?: { status?: number }) => ({ status: opts?.status ?? 200, body }) },
    }));
    jest.doMock('next/headers', () => ({ cookies: () => ({ get: () => null }) }));

    // Override the supabase server client to simulate unauthenticated user
    jest.doMock('@/lib/supabase/server', () => ({
      createServerClient: () => ({
        auth: { getUser: async () => ({ data: { user: null } }) },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { message: 'not found' } }) }) }) }),
      }),
    }));

    // Reset modules so our mocks apply, then import the route
    jest.resetModules();
    const { POST } = await import('@/app/api/disputes/route');

    // Call POST with a minimal request object that exposes json()
    const req = { json: async () => ({ milestoneId: 'x' }) } as unknown as Request;
    const res = await POST(req);
    // our mocked NextResponse.json returns an object with status
    // when unauthorized we expect 401
    expect((res as any).status).toBe(401);
  });
});
