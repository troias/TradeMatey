import { NextResponse } from 'next/server';

jest.resetModules();

describe('POST /api/payments without tradie', () => {
  beforeEach(() => {
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const chain: any = { select: () => chain, eq: () => chain, single: async () => {
            if (table === 'milestones') return { data: { id: 'mid-1', jobs: { client_id: 'client-1' }, tradie_id: null, status: 'pending' }, error: null };
            if (table === 'users') return { data: { stripe_customer_id: 'cus_123' }, error: null };
            return { data: null, error: null };
          } };
          chain.insert = async () => ({ data: null, error: null });
          chain.update = () => chain;
          return chain;
        },
      }),
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 when milestone has no tradie', async () => {
    const { POST } = await import('@/app/api/payments/route');
    const req = { json: async () => ({ milestoneId: 'mid-1', amount: 100 }) } as unknown as Request;
    const res = await POST(req as unknown as Request);
    expect((res as any).status).toBe(400);
    expect((res as any).body).toMatchObject({ error: 'Milestone does not have an assigned tradie' });
  });
});
