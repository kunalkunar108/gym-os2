# Supabase setup (GymOS)

## 1. Create the project

1. Create a Supabase project in your Supabase account.
2. Keep the database password in a password manager; do not commit it.
3. In Project Settings → API, copy the Project URL and the publishable/anon key.
4. Copy `.env.example` to `.env.local` and fill in those two values.

Only the public/publishable key belongs in `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Never put a service-role or secret key in a `NEXT_PUBLIC_*` variable or browser code.

## 2. Apply the database migration

Open the Supabase SQL Editor and run the complete file:

`supabase/migrations/0001_initial_schema.sql`

Alternatively, install the Supabase CLI and use its linked migration workflow. Do not run the migration twice manually.

## 3. What this migration creates

- User profiles linked to Supabase Auth.
- Gym registration requests with a pending approval status.
- Owner membership and default gym settings created automatically on gym registration.
- Platform plans and separate GymOS subscription/payment records.
- Gym-scoped members, membership plans, memberships, member payments, attendance and audit logs.
- RLS policies and security-definer helper functions for tenant membership checks.

Gym approval and GymOS subscription status are separate. Approved gym users can access that gym's workspace regardless of billing status; subscription enforcement belongs in the application access workflow so an expired gym can still reach renewal/payment screens.

## 4. Important security limits

- A new account is always created as a normal platform user. Users cannot grant themselves platform super-admin.
- Gym registration is self-service but starts as pending. A trusted platform-admin action must approve or reject it.
- Gym staff membership changes and platform subscription creation are intentionally not open to client-side writes.
- Financial rows are readable by gym users and insert-only for ordinary users. Corrections should be implemented as auditable reversal entries, not silent edits.
- Do not use real customer data until cross-tenant RLS tests and privileged server-side workflows have been implemented and passed.

## 5. Current status

The migration and typed Supabase client helpers are a foundation, not a complete authentication experience. The next implementation step is sign-in/sign-up, session refresh, protected routes, gym registration UI and trusted super-admin workflows.
