import fetch from 'node-fetch';

describe('GET /api/internal/health', () => {
  let handler: any;

  beforeAll(async () => {
    // Lazy import the route handler so tests-first will fail until implementation exists
    try {
      handler = (await import('../../src/app/api/internal/health/route')).GET_RAW;
    } catch (e) {
      handler = null;
    }
  });

  test('handler exists and returns expected shape', async () => {
    expect(handler).toBeDefined();
    const json = await handler();
    expect(json).toBeDefined();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('services');
    expect(json.status).toBe('ok');
    expect(json.services).toHaveProperty('supabase');
  });
});
