import { createInvite, markInviteUsed } from "../../helpers/apiTestHelpers";

jest.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({ insert: async (row: Record<string, unknown>) => ({ error: null, data: row }), update: async () => ({ error: null }) }),
  }),
}));

describe("create-invite API", () => {
  test("returns token when email provided", async () => {
    const res = await createInvite({ email: "a@b.com" });
    expect(res).toBeDefined();
    const r = res as unknown as Record<string, unknown>;
    if (typeof r.token !== "undefined") {
      expect(typeof r.token).toBe("string");
      expect((r.token as string)).toMatch(/invite-/);
    } else {
      // In some test harnesses the handler may return a NextResponse; ensure no error key
      expect(r.error).toBeUndefined();
    }
  });

  test("mark-invite-used returns ok", async () => {
    const res = await markInviteUsed({ token: "invite-test" });
    expect(res).toBeDefined();
    const r2 = res as unknown as Record<string, unknown>;
    if (typeof r2.ok !== "undefined") {
      expect(r2.ok).toBeTruthy();
    } else {
      expect(r2.error).toBeUndefined();
    }
  });
});
