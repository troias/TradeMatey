describe("admin invites helper (js)", () => {
  test("createInviteForEmail returns token when insert succeeds", async () => {
    const { createInviteForEmail } = await import("@/lib/admin/invites");
    const mockClient = {
      from: () => ({ insert: async () => ({ error: null }) }),
    };
    const token = await createInviteForEmail("a@b.com", mockClient);
    expect(typeof token).toBe("string");
    expect(token.startsWith("invite-")).toBeTruthy();
  });

  test("markInviteUsedToken returns true when update succeeds", async () => {
    const { markInviteUsedToken } = await import("@/lib/admin/invites");
    const mockClient = {
      from: () => ({ update: () => ({ eq: async () => ({ error: null }) }) }),
    };
    const res = await markInviteUsedToken("invite-1", mockClient);
    expect(res).toBeTruthy();
  });
});
