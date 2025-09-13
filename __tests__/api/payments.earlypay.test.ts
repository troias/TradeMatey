import { mockSupabaseClient, restoreFetch } from '../../test-helpers/mockServer';

describe('payments early-pay behavior', () => {
  beforeEach(() => {
    mockSupabaseClient();
    jest.resetModules();
  });
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('blocks payment when milestone has no tradie assigned and allows with force_pay_early', async () => {
    // Mock next/server
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: unknown, o?: unknown) => ({ status: (o as any)?.status ?? 200, body: b }) } }));

    // Mock supabase responses for milestone without tradie
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'client-1' } } }) },
        from: (table: string) => {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            single: async () => {
              if (table === 'milestones') return { data: { id: 'm1', job_id: 'j1', title: 'Test MS', status: 'created', jobs: { client_id: 'client-1', region: null }, tradie_id: null }, error: null };
              if (table === 'users') return { data: { stripe_customer_id: 'cus_test' }, error: null };
              return { data: null, error: null };
            },
            insert: async (v: unknown) => ({ data: v, error: null }),
            update: (v: unknown) => ({
              eq: async () => ({ data: v, error: null }),
            }),
          };
          return chain;
        },
      }),
    }));

    // Mock Stripe but it should not be called for the blocked case
    jest.doMock('stripe', () => {
      return function Stripe() {
        return { paymentIntents: { create: async () => ({ id: 'pi_1', client_secret: 's' }) } };
      };
    });

    const { POST } = await import('@/app/api/payments/route');

    // First call without force_pay_early should return 400
    const req1 = { json: async () => ({ milestoneId: 'm1', amount: 100 }) } as unknown as Request;
  const res1 = await POST(req1);
  // debug: log response
  // eslint-disable-next-line no-console
  console.log('payments early-pay res1:', res1);
  expect((res1 as any).status).toBe(400);

    // Now call with force_pay_early true: should proceed (mocked PI)
    const req2 = { json: async () => ({ milestoneId: 'm1', amount: 100, force_pay_early: true }) } as unknown as Request;
  // temporarily restore console.error to see server-side errors during test
  if ((console as any).error && typeof (console as any).error.restore === 'function') (console as any).error.restore();
  const res2 = await POST(req2);
  // eslint-disable-next-line no-console
  console.log('payments early-pay res2:', res2);
  expect((res2 as any).status).toBe(200);
  expect((res2 as any).body.clientSecret).toBeDefined();
  });
});
