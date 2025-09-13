import { restoreFetch } from '../../test-helpers/mockServer';

describe('payments edge cases', () => {
  beforeEach(() => {
    jest.resetModules();
  });
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('quick-pay fails when user has no stripe customer', async () => {
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            single: async () => {
              if (table === 'milestones') return { data: { id: 'm1', job_id: 'j1', title: 'Test MS', status: 'pending', jobs: { client_id: 'client-1', region: null }, tradie_id: 'tradie-1' }, error: null };
              if (table === 'users') return { data: null, error: null };
              return { data: null, error: null };
            },
            insert: async (v: unknown) => ({ data: v, error: null }),
            update: (v: unknown) => ({ eq: async () => ({ data: v, error: null }) }),
          };
          return chain;
        },
      }),
    }));

    const { POST } = await import('@/app/api/payments/route');
    const req = { json: async () => ({ milestoneId: 'm1', amount: 100, useSaved: true, paymentMethodId: 'pm_1' }) } as unknown as Request;
    const res = await POST(req);
    expect((res as any).status).toBe(400);
  });

  it('payment pending flow sets payment as pending when PaymentIntent not succeeded', async () => {
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            single: async () => {
              if (table === 'milestones') return { data: { id: 'm1', job_id: 'j1', title: 'Test', status: 'pending', jobs: { client_id: 'client-1', region: null }, tradie_id: 'tradie-1' }, error: null };
              if (table === 'users') return { data: { stripe_customer_id: 'cus_test' }, error: null };
              return { data: null, error: null };
            },
            insert: async (v: unknown) => ({ data: v, error: null }),
            update: (v: unknown) => ({ eq: async () => ({ data: v, error: null }) }),
          };
          return chain;
        },
      }),
    }));

    // mock stripe to return a not-succeeded payment
    jest.doMock('stripe', () => {
      return function Stripe() {
        return {
          paymentIntents: { create: async () => ({ id: 'pi_1', client_secret: 's', status: 'requires_action' }) },
          transfers: { create: async () => ({ id: 'tr_1' }) },
        };
      };
    });

    const { POST } = await import('@/app/api/payments/route');
    const req = { json: async () => ({ milestoneId: 'm1', amount: 100, useSaved: false }) } as unknown as Request;
    const res = await POST(req);
    expect((res as any).status).toBe(200);
    expect((res as any).body.clientSecret).toBeDefined();
  });
});
