async function callPostRoute(routePath: string, body: Record<string, unknown>) {
  const mod = await import(routePath);
  const handler = (mod.POST ?? mod.default) as unknown;
  const req = new Request(`http://localhost${routePath.replace('@/app', '/api')}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

  // Handler signature may be exported as POST function (Next.js app router)
  const handlerFn = typeof handler === 'function' ? (handler as (req: Request) => Promise<unknown>) : null;
  const res = handlerFn ? await handlerFn(req as unknown as Request) : null;

  if (res && typeof (res as unknown as { json?: unknown }).json === 'function') {
    return (res as unknown as { json: () => Promise<Record<string, unknown>> }).json();
  }
  return res as unknown as Record<string, unknown>;
}

export async function createInvite(body: Record<string, unknown>) {
  return callPostRoute('@/app/api/admin/create-invite/route', body);
}

export async function markInviteUsed(body: Record<string, unknown>) {
  return callPostRoute('@/app/api/admin/mark-invite-used/route', body);
}
