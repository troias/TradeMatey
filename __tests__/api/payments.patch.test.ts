import { mockSupabaseClient, restoreFetch } from '../../test-helpers/mockServer';

describe('payments PATCH route', () => {
  beforeEach(() => {
    mockSupabaseClient();
    jest.resetModules();
  });
  afterEach(() => {
    restoreFetch();
    jest.restoreAllMocks();
  });

  it('verifies payment and creates transfer', async () => {
    // Mock next/server
    jest.doMock('next/server', () => ({ NextResponse: { json: (b: any, o?: any) => ({ status: o?.status ?? 200, body: b }) } }));

    // Mock supabase responses for milestone, payments and accounts
    jest.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: { getUser: async () => ({ data: { user: { id: 'tradie-1' } } }) },
        from: (table: string) => {
          const chain: any = {
            select: () => chain,
            eq: () => chain,
            single: async () => {
              if (table === 'milestones') return { data: { id: 'm1', job_id: 'j1', title: 'Title', jobs: { tradie_id: 'tradie-1', region: undefined } }, error: null };
              if (table === 'payments') return { data: { payment_intent_id: 'pi_1', amount: 100, client_id: 'client-1' }, error: null };
              if (table === 'accounts') return { data: { stripe_account_id: 'acct_1' }, error: null };
              return { data: null, error: null };
            },
            limit: async () => ({ data: null, error: null }),
            insert: async (v: any) => ({ data: v, error: null }),
            update: () => ({ eq: async () => ({ data: null, error: null }) }),
            delete: () => ({ eq: async () => ({ data: null, error: null }) }),
          };
          return chain;
        },
      }),
    }));

    // Mock Stripe to return succeeded intent and transfer creation
    jest.doMock('stripe', () => {
      return function Stripe() {
        return {
          paymentIntents: { retrieve: async () => ({ id: 'pi_1', status: 'succeeded' }) },
          transfers: { create: async () => ({ id: 'tr_1' }) },
        };
      };
    });

    const { PATCH } = await import('@/app/api/payments/route');
    const req = { json: async () => ({ milestoneId: 'm1' }) } as unknown as Request;
  // Restore console.error temporarily so the route's catch logs are visible for debugging
  if (console.error && typeof console.error.restore === 'function') console.error.restore();
  const res = await PATCH(req);
  // Re-mute
  if (console.error && typeof console.error.restore === 'function') console.error.restore();
    // debug: print response body for failing CI
    if (res && typeof (res as any).json === 'function') {
      // NextResponse-like
      // eslint-disable-next-line no-console
      console.log('PATCH body:', await (res as any).json());
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((res as any).status).toBe(200);
    } else {
      // plain object
      // eslint-disable-next-line no-console
      console.log('PATCH body plain:', res);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((res as any).status).toBe(200);
    }
  });
});
