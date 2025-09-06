import { mockSupabaseClient, restoreFetch } from '../../test-helpers/mockServer';

describe('payments route', () => {
  beforeEach(() => {
    mockSupabaseClient();
    jest.resetModules();
  });

  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('creates a PaymentIntent with saved method (quick-pay)', async () => {
    // Mock next/server
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));
    // Mock supabase with table-aware responses
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const base = {
            insert: async (_v: unknown) => ({ data: null, error: null }),
            update: (_v: unknown) => ({
              eq: async (_col: string, _val: any) => ({ data: null, error: null }),
            }),
            select: () => ({
              eq: (_col: string, _val: any) => ({
                single: async () => {
                  if (table === 'milestones') {
                    return { data: { id: 'm1', job_id: 'j1', title: 'Test MS', status: 'pending', jobs: { client_id: 'client-1', region: null } }, error: null };
                  }
                  if (table === 'users') {
                    return { data: { stripe_customer_id: 'cus_test' }, error: null };
                  }
                  if (table === 'payments') {
                    return { data: null, error: null };
                  }
                  if (table === 'accounts') {
                    return { data: { stripe_account_id: 'acct_123' }, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
            }),
          };
          return base as any;
        },
      }),
    }));

    // Mock Stripe library: paymentIntents.create returns succeeded
    const mockPI = { id: 'pi_123', client_secret: 'secret_abc', status: 'succeeded' };
    jest.doMock('stripe', () => {
      return function Stripe() {
        return {
          paymentIntents: {
            create: async () => mockPI,
            retrieve: async () => mockPI,
          },
          transfers: { create: async () => ({ id: 'tr_1' }) },
        };
      };
    });

    const { POST } = await import('@/app/api/payments/route');
    const req = { json: async () => ({ milestoneId: 'm1', amount: 100, useSaved: true, paymentMethodId: 'pm_1' }) } as unknown as Request;
    const res = await POST(req);
    expect((res as any).status).toBe(200);
    expect((res as any).body.clientSecret).toBe('secret_abc');
  });
});
