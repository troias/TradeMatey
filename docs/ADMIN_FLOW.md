## Admin flow: invite-based, server-enforced

This document explains the admin onboarding and authorization flow implemented in the codebase and recommends production-grade practices.

Overview
- Admin accounts must be explicitly invited. Invites are single-use tokens stored in `admin_invites`.
- Admin invite creation and redemption are server-only operations performed with the Supabase service role (not from client code).
- The client admin login page may accept an `invite_token` query param which is validated with `/api/admin/validate-invite` before allowing magic-link or OAuth.
- After a successful sign-in, the server-side redemption process marks the invite as used and a server-only RPC grants the `admin` role.

Files added
- `src/app/api/admin/create-invite/route.ts` — server-only endpoint that creates an invite row using the service key.
- `src/app/api/admin/validate-invite/route.ts` — server endpoint to validate a token's existence and unused state.
- `src/app/api/admin/mark-invite-used/route.ts` — server endpoint to mark an invite token as used after successful redemption.
- `supabase/migrations/20250826_create_admin_invites.sql` — example migration for `admin_invites` table.

Why this model?
- Security: client code cannot write to `user_roles` or create admin grants. All privileged actions require the service key.
- Least privilege: invites are single-use and time-limited (recommended to add TTL column in production).
- Auditing: invite creation and redemption should be logged with `created_by` and timestamps.

Production recommendations (million-dollar app)
- Use SSO (Google Workspace or Okta) and require MFA for all admin accounts.
- Require existing admin or a separate admin-issuing system to create invites. Store `created_by` and reason.
- Make invite tokens single-use, short TTL, and tied to an email address.
- Implement server-side mark-used and a server RPC that performs the admin role grant. Do not allow client-side role insertion.
- Use Postgres RLS and policies to guard sensitive tables like `user_roles` and `admin_invites`.
- Add audit logs and alerts for suspicious activity (multiple invites, many failed redemptions, rapid admin grants).
- Create a separate admin-only environment (or subdomain) and use different auth session policies there.

Next small steps to implement
1. Add a server-only RPC (or endpoint) that redeems an invite and grants admin role using the Supabase service role.
2. Add TTL and email binding to invites, and a cron to expire old invites.
3. Add tests and CI checks for the invite creation/redemption lifecycle.
