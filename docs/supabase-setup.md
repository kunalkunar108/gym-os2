# Supabase setup (GymOS)

## 1. Create the project

1. Create a Supabase project in your Supabase account.
2. Keep the database password in a password manager; do not commit it.
3. In Project Settings → API, copy the Project URL and the publishable/anon key.
4. Copy `.env.example` to `.env.local` and fill in those two values.

Only the public/publishable key belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put a service-role or secret key in a `NEXT_PUBLIC_*` variable or browser code.

## 2. Apply the database migration

Open the Supabase SQL Editor and run the complete file:

`supabase/migrations/0001_initial_schema.sql`, `supabase/migrations/0002_secure_gym_creation_trigger.sql`, then `supabase/migrations/0003_multi_gym_workspace_indexes.sql`

Alternatively, install the Supabase CLI and use its linked migration workflow. Do not run the migration twice manually.

## 3. What this migration creates

- User profiles linked to Supabase Auth.
- Gym registration requests with a pending approval status.
- Owner membership and default gym settings created automatically on gym registration.
- Platform plans and separate GymOS subscription/payment records.
- Gym-scoped members, membership plans, memberships, member payments, attendance and audit logs.
- Multi-gym accounts: one user can own or work in multiple approved gyms; each workspace is selected independently and remains isolated by `gym_id`.
- Active workspace selection is stored in a secure, HTTP-only cookie and revalidated against the user's active `gym_users` membership on every server request.
- RLS policies and security-definer helper functions for tenant membership checks.

Gym approval and GymOS subscription status are separate. Approved gym users can access that gym's workspace regardless of billing status; subscription enforcement belongs in the application access workflow so an expired gym can still reach renewal/payment screens.

## 4. Important security limits

- A new account is always created as a normal platform user. Users cannot grant themselves platform super-admin.
- Gym registration is self-service but starts as pending. A trusted platform-admin action must approve or reject it.
- Gym staff membership changes and platform subscription creation are intentionally not open to client-side writes.
- Financial rows are readable by gym users and insert-only for ordinary users. Corrections should be implemented as auditable reversal entries, not silent edits.
- Do not use real customer data until cross-tenant RLS tests and privileged server-side workflows have been implemented and passed.

## 5. Current status

The schema and authentication/onboarding UI are committed. Apply all three migrations in order. Configure the Supabase URL and publishable/anon key locally in `.env.local`, then test signup, email confirmation, login and gym registration. The privileged super-admin approval workflow and cross-tenant integration tests are still pending.


## 6. Bootstrap the first platform super-admin

The first signed-up account is intentionally created as a normal user. After you have registered your own account and confirmed its profile exists, use the Supabase SQL Editor as the project owner to promote exactly that account once:

```sql
update public.profiles
set platform_role = 'super_admin'
where id = 'YOUR_AUTH_USER_UUID';
```

Find the UUID in Authentication → Users. Replace the placeholder with that exact UUID. Never expose a service-role key or allow a browser request to set this role. Keep super-admin provisioning restricted to the trusted Supabase project owner.

## 7. Database permissions

The migration grants authenticated users only the table operations required by the current policies and explicitly revokes anonymous access to these tables. RLS remains the tenant-level access boundary.
