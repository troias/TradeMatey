import { mockSupabaseClient, restoreFetch } from '../../test-helpers/mockServer';

describe('jobs accept opt-out', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('accept with assign_milestones:false does not assign milestones', async () => {
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));
    let milestonesUpdated = false;
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const chain: any = { select: () => chain, eq: () => chain, single: async () => ({ data: { client_id: 'client-1' }, error: null }) };
            chain.upsert = async () => ({ data: null, error: null });
            chain.update = (v: unknown) => {
              if (table === 'milestones') milestonesUpdated = true;
              return chain;
            };
            // support other supabase chain methods used by the route
            chain.neq = () => chain;
            chain.is = () => chain;
            chain.insert = async () => ({ data: null, error: null });
          return chain;
        },
      }),
    }));

    const { POST } = await import('@/app/api/jobs/accept/route');
    const req = { json: async () => ({ job_id: 'job-1', tradie_id: 'tradie-1', assign_milestones: false }) } as unknown as Request;
    const res = await POST(req);
    // debug output when server returned 500
    if ((res as any).status === 500) {
      // Try to print NextResponse-like body
      try {
        // eslint-disable-next-line no-console
        console.log('accept route body:', await (res as any).json());
      } catch (e) {
        // ignore
      }
    }
    expect((res as any).status).toBe(200);
    expect(milestonesUpdated).toBe(false);
  });
});
