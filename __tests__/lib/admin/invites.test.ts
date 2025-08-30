import { createInviteForEmail, markInviteUsedToken } from "@/lib/admin/invites";

describe("admin invites helper", () => {
  test("createInviteForEmail returns token when insert succeeds", async () => {
    const mockClient = {
      from: () => ({ insert: async (_row: Record<string, unknown>) => ({ error: null }) }),
    } as const;
    const token = await createInviteForEmail("a@b.com", mockClient as unknown as any as unknown);
    expect(typeof token).toBe("string");
    expect(token.startsWith("invite-")).toBeTruthy();
  });

  test("markInviteUsedToken returns true when update succeeds", async () => {
    const mockClient = {
      from: () => ({ update: () => ({ eq: async (_token: string, _val: unknown) => ({ error: null }) }) }),
    } as const;
    const res = await markInviteUsedToken("invite-1", mockClient as unknown as unknown);
    expect(res).toBeTruthy();
  });
});
