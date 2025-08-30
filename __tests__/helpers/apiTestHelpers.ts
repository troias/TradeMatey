export async function createInvite(body: Record<string, unknown>) {
  const { POST: createInviteHandler } = await import("@/app/api/admin/create-invite/route");
  const req = new Request("http://localhost/api/admin/create-invite", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await createInviteHandler(req as unknown as Request);
  // Handler may return NextResponse or a plain object in test env
  if (res && typeof (res as unknown as { json?: unknown }).json === "function")
    return (res as unknown as { json: () => Promise<Record<string, unknown>> }).json();
  return res as unknown as Record<string, unknown>;
}

export async function markInviteUsed(body: Record<string, unknown>) {
  const { POST: markInviteUsedHandler } = await import("@/app/api/admin/mark-invite-used/route");
  const req = new Request("http://localhost/api/admin/mark-invite-used", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const res = await markInviteUsedHandler(req as unknown as Request);
  if (res && typeof (res as unknown as { json?: unknown }).json === "function")
    return (res as unknown as { json: () => Promise<Record<string, unknown>> }).json();
  return res as unknown as Record<string, unknown>;
}
