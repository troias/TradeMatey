Role assignment workflow

Overview

- Use a pending + approval flow to avoid admins accidentally granting roles.
- App flow:
  1. Admin requests a role change via POST /api/admin/roles/request with { targetUserId, role, reason }.
  2. Approvers POST to /api/admin/roles/approve with { pendingId, approve: true } — when 2 approvals are recorded the system applies the role.
  3. Applying the role calls DB RPCs which write audit logs and enqueue outbox events.

Endpoints

- POST /api/admin/roles/request

  - Body: { targetUserId, role, reason }
  - Auth: supabase session required

- POST /api/admin/roles/approve
  - Body: { pendingId, approve }
  - Auth: supabase session required

DB artifacts

- Table: public.pending_role_changes
- RPC: public.assign_role(...) and public.apply_pending_role_change(...)

How to test locally

1. Apply migrations: run your supabase migration flow or psql against your dev DB.
2. Start Next.js dev server.
3. As an admin user (role 'admin'), POST to /api/admin/roles/request.
4. As two distinct approvers, POST to /api/admin/roles/approve with approve=true until status becomes 'approved'.
