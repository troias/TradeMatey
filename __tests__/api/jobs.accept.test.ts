import { restoreFetch } from '../../test-helpers/mockServer';

describe('jobs accept route', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('assigns unassigned milestones to accepted tradie by default', async () => {
    // Mock next/server
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));

    let milestonesUpdatedWith: any = null;

    // Mock supabase createClient used by the route
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          // chainable API helper
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            neq: () => chain,
            is: () => chain,
            single: async () => {
              if (table === 'jobs') return { data: { client_id: 'client-1' }, error: null };
              return { data: null, error: null };
            },
            insert: async (v: unknown) => ({ data: v, error: null }),
            upsert: async (_v: unknown, _opts?: unknown) => ({ data: null, error: null }),
          };

          // special-case update for milestones and jobs: return chainable objects
          chain.update = (v: unknown) => {
            if (table === 'milestones') {
              milestonesUpdatedWith = v;
              return {
                eq: () => ({
                  is: async () => ({ data: v, error: null }),
                  neq: () => ({ is: async () => ({ data: v, error: null }) }),
                }),
              };
            }
            if (table === 'jobs') {
              return {
                eq: () => ({
                  select: () => ({
                    single: async () => ({ data: { id: 'job-1', tradie_id: 'tradie-1', status: 'in_progress' }, error: null }),
                    }),
                }),
              };
            }
            // default: return the base chain so callers can call .eq().neq() etc.
            return chain;
          };

          return chain;
        },
      }),
    }));

    const { POST } = await import('@/app/api/jobs/accept/route');
    const req = { json: async () => ({ job_id: 'job-1', tradie_id: 'tradie-1' }) } as unknown as Request;
  // Temporarily restore console.error so route errors are visible in test output
  // (some test harnesses mock console)
  if ((console as any).error && typeof (console as any).error.restore === 'function') (console as any).error.restore();
  const res = await POST(req);
  // Print response for debugging
  // eslint-disable-next-line no-console
  console.log('jobs.accept response:', res);
  expect((res as any).status).toBe(200);
    // Ensure milestones update included the tradie_id set by the route
    expect(milestonesUpdatedWith).not.toBeNull();
    expect((milestonesUpdatedWith as any).tradie_id).toBe('tradie-1');
  });
});
