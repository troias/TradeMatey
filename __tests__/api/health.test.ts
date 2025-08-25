describe('GET /api/internal/health', () => {
  let handler: any;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    
    // Lazy import the route handler so tests-first will fail until implementation exists
    try {
      const routeModule = await import('../../src/app/api/internal/health/route');
      handler = routeModule.GET_RAW;
    } catch (e) {
      handler = null;
    }
  });

  test('handler exists and returns expected shape', async () => {
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
    
    const json = await handler();
    expect(json).toBeDefined();
    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('services');
    expect(json.status).toBe('ok');
    expect(json.services).toHaveProperty('supabase');
  });
});
