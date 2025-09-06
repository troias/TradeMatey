// Integration test for redeem_admin_invite RPC.
// This test runs only when DATABASE_URL is present in the environment.

describe('redeem_admin_invite RPC integration', () => {
  let client: any = null;
  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.warn('Skipping redeem_admin_invite integration tests: DATABASE_URL not set');
      return;
    }
    // import pg only when needed
    const { Client } = await import('pg');
    client = new Client({ connectionString: databaseUrl });
    await client.connect();
  });
  afterAll(async () => {
    if (client) await client.end();
  });

  test('redeem flow basic', async () => {
    if (!client) return;
    // create a user and invite
    await client.query("INSERT INTO users (id, email) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@a.com') ON CONFLICT DO NOTHING");
    await client.query("INSERT INTO admin_invites (token, invited_email, used) VALUES ('itest-token', 'a@a.com', false) ON CONFLICT DO NOTHING");

    await client.query("SELECT redeem_admin_invite($1, $2)", ['itest-token', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa']);

    const roles = await client.query("SELECT role FROM user_roles WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'");
    expect(roles.rows.some((r: { role: string }) => r.role === 'admin')).toBeTruthy();
  });
});
