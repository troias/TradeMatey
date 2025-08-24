/**
 * @jest-environment node
 */

import { randomBytes, createHash } from 'crypto';

// Types for our mocks
type MockResponse = {
  data: any;
  error: null | Error;
};

type MockSupabaseQuery = {
  select: jest.Mock<MockSupabaseQuery>;
  insert: jest.Mock<Promise<MockResponse>>;
  update: jest.Mock<Promise<MockResponse>>;
  delete: jest.Mock<Promise<MockResponse>>;
  eq: jest.Mock<MockSupabaseQuery>;
  single: jest.Mock<Promise<MockResponse>>;
  limit: jest.Mock<Promise<MockResponse>>;
};

type MockSupabaseClient = {
  from: jest.Mock<MockSupabaseQuery>;
  rpc: jest.Mock<Promise<MockResponse>>;
};

let mockSupabase: MockSupabaseClient;

// Mock modules before importing worker
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase),
}));

describe('HubSpot Worker', () => {
  type MockResponse = { data: any; error: null | Error };
  type MockSupabaseQuery = {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    eq: jest.Mock;
    single: jest.Mock;
    limit: jest.Mock;
  };

  let mockSupabase: { from: jest.Mock; rpc: jest.Mock };
  type MockResponse = {
    data: any;
    error: null | Error;
  };

  type MockSupabaseQuery = {
    select: jest.Mock<MockSupabaseQuery>;
    insert: jest.Mock<Promise<MockResponse>>;
    update: jest.Mock<Promise<MockResponse>>;
    delete: jest.Mock<Promise<MockResponse>>;
    eq: jest.Mock<MockSupabaseQuery>;
    single: jest.Mock<Promise<MockResponse>>;
    limit: jest.Mock<Promise<MockResponse>>;
  };

  type MockSupabaseClient = {
    from: jest.Mock<MockSupabaseQuery>;
    rpc: jest.Mock<Promise<MockResponse>>;
  };

  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    // Set up environment variables for each test
    process.env.SUPABASE_URL = 'http://localhost:54321';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.HUBSPOT_ACCESS_TOKEN = 'test-access-token';
    process.env.APP_TOKEN_KEY = 'test-app-key';

    // Create base mock query
    const baseQuery: Partial<MockSupabaseQuery> = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockResolvedValue({ data: null, error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    // Set up mock Supabase client
    mockSupabase = {
      from: jest.fn().mockImplementation((table: string) => ({
        ...baseQuery,
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue(
          table === 'users' 
            ? { data: { id: 'test-user', email: 'test@example.com', roles: ['user'] }, error: null }
            : { data: null, error: null }
        ),
        limit: jest.fn().mockResolvedValue(
          table === 'hubspot_portals'
            ? { data: [{ id: 'test-portal', access_token: 'test-token', expires_at: '2026-01-01' }], error: null }
            : { data: null, error: null }
        )
      })) as jest.Mock<MockSupabaseQuery>,
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'lock_hubspot_sync_queue') {
          return Promise.resolve({
            data: [{ id: 1, user_id: 'test-user', attempts: 0 }],
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      })
    };

    // Reset all mocks
    jest.resetModules();

  afterEach(() => {
    // Clean up environment variables
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.HUBSPOT_ACCESS_TOKEN;
    delete process.env.APP_TOKEN_KEY;
    delete process.env.HUBSPOT_CLIENT_ID;
    delete process.env.HUBSPOT_CLIENT_SECRET;
  });

    // Set up mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      rpc: jest.fn().mockImplementation((name: string) => {
        if (name === 'lock_hubspot_sync_queue') {
          return Promise.resolve({
            data: [{
              id: 1,
              user_id: 'test-user',
              next_run_at: null,
              attempts: 0
            }],
            error: null
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    };

    // Mock Supabase client
    jest.mock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => mockSupabase),
    }));

  describe('Encryption', () => {
    it('should derive a key correctly', async () => {
      const { deriveKey } = await import('../../../src/workers/hubspot/worker');
      const key = deriveKey('test-key');
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32); // SHA-256 produces 32 bytes
    });

    it('should encrypt text correctly', async () => {
      const { encrypt } = await import('../../../src/workers/hubspot/worker');
      const text = 'test-text';
      const keyStr = 'test-key';
      const encrypted = encrypt(text, keyStr);
      
      // Base64 encoded string containing: iv(12) + tag(16) + ciphertext
      expect(typeof encrypted).toBe('string');
      expect(Buffer.from(encrypted, 'base64').length).toBeGreaterThan(28); // At least iv + tag
    });

    it('should decrypt text correctly', async () => {
      const { encrypt, decrypt } = await import('../../../src/workers/hubspot/worker');
      const originalText = 'test-text';
      const keyStr = 'test-key';
      
      const encrypted = encrypt(originalText, keyStr);
      const decrypted = decrypt(encrypted, keyStr);
      
      expect(decrypted).toBe(originalText);
    });
  });

  describe('Token Management', () => {
    beforeEach(() => {
      jest.resetModules();
    });

    it('should detect when OAuth is enabled', async () => {
      process.env.HUBSPOT_CLIENT_ID = 'test-client-id';
      process.env.HUBSPOT_CLIENT_SECRET = 'test-client-secret';
      
      const { USE_OAUTH } = await import('../../../src/workers/hubspot/worker');
      expect(USE_OAUTH).toBe(true);
    });

    it('should handle missing Supabase configuration', async () => {
      delete process.env.SUPABASE_URL;

      await expect(import('../../../src/workers/hubspot/worker')).rejects.toThrow();
    });
  });

  describe('Queue Processing', () => {
    interface MockSupabaseTable {
      select: jest.Mock;
      insert: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      eq: jest.Mock;
      single: jest.Mock;
      limit: jest.Mock;
    }

    interface MockSupabase {
      from: jest.Mock<MockSupabaseTable>;
      rpc: jest.Mock;
    }

    let mockSupabase: MockSupabase;

    beforeEach(() => {
      jest.resetModules();
      
      // Create more detailed Supabase mock
      const mockDb = {
        users: {
          data: [{ id: 'test-user', email: 'test@example.com', roles: ['user'] }],
          error: null
        },
        hubspot_portals: {
          data: [{ id: 'test-portal', portal_id: 'test-portal-id', access_token: 'test-access-token' }],
          error: null
        }
      };

      mockSupabase = {
        from: jest.fn((table: string) => {
          const tableData = mockDb[table as keyof typeof mockDb];
          return {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockResolvedValue({ data: [], error: null }),
            update: jest.fn().mockResolvedValue({ data: [], error: null }),
            delete: jest.fn().mockResolvedValue({ data: null, error: null }),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue(tableData),
            limit: jest.fn().mockResolvedValue(tableData)
          };
        }),
        rpc: jest.fn().mockImplementation((name: string) => {
          if (name === 'lock_hubspot_sync_queue') {
            return Promise.resolve({
              data: [{
                id: 1,
                user_id: 'test-user',
                attempts: 0
              }],
              error: null
            });
          }
          if (name === 'upsert_hubspot_worker_metric') {
            return Promise.resolve({ data: null, error: null });
          }
          return Promise.resolve({ data: [], error: null });
        }),
      };

      jest.mock('@supabase/supabase-js', () => ({
        createClient: jest.fn(() => mockSupabase),
      }));
    });

    it('should track metrics correctly', async () => {
      const { lockAndProcess, metrics, encrypt } = await import('../../../src/workers/hubspot/worker');
      
      // Mock successful queue processing
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          id: 1,
          user_id: 'test-user',
          payload: encrypt(JSON.stringify({ test: 'data' }), process.env.APP_TOKEN_KEY || '')
        }],
        error: null
      });

      // Mock user lookup
      const baseTable: MockSupabaseTable = {
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
        update: jest.fn().mockResolvedValue({ data: null, error: null }),
        delete: jest.fn().mockResolvedValue({ data: null, error: null }),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
        limit: jest.fn().mockResolvedValue({ data: null, error: null })
      };

      mockSupabase.from.mockImplementation((table: string) => {
        const tableOverrides: { [key: string]: Partial<MockSupabaseTable> } = {
          users: {
            single: jest.fn().mockResolvedValue({
              data: { id: 'test-user', email: 'test@example.com', roles: ['user'] },
              error: null
            })
          },
          hubspot_portals: {
            limit: jest.fn().mockResolvedValue({
              data: [{ 
                id: 'test-portal',
                portal_id: 'test-portal-id',
                access_token: 'test-access-token'
              }],
              error: null
            })
          }
        };

        return {
          ...baseTable,
          ...(tableOverrides[table] || {})
        };
      });

      // Mock fetch for HubSpot API
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve({
            status: 200,
            json: () => Promise.resolve({ results: [] })
          });
        }
        if (url.includes('/contacts')) {
          return Promise.resolve({
            status: 201,
            json: () => Promise.resolve({ id: 'test-contact' })
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      await lockAndProcess(1);
      expect(metrics.processed).toBe(1);
      expect(metrics.errors).toBe(0);
    });

    it('should handle processing errors', async () => {
      const { lockAndProcess, metrics } = await import('../../../src/workers/hubspot/worker');
      
      // Mock failed queue processing
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [{
          id: 1,
          user_id: 'test-user',
          payload: 'invalid-payload'
        }],
        error: null
      });

      await lockAndProcess(1);
      expect(metrics.errors).toBeGreaterThan(0);
    });
  });
});
