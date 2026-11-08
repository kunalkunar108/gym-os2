# GymOS

Multi-tenant gym management SaaS for independent gyms in India.

## Product direction

GymOS gives each gym an isolated workspace to manage members, membership plans, renewals, member payments, receipts, attendance and staff. A separate platform super-admin workflow will manage gym approval and GymOS subscription verification.

## Technology

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Supabase Auth and PostgreSQL
- Multi-tenant gym workspaces with active workspace switching
- Row Level Security for tenant isolation (required before real customer data)
- Vercel deployment target
- Responsive web app with PWA foundation

## Local development

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Current implementation status

The project includes Supabase authentication, gym registration and approval foundations, gym-scoped operational tables, RLS policies, staff invitations, and a multi-gym workspace selector. Each user can access multiple approved gyms; server-side workspace selection is validated against active gym membership.

## Security release blockers

Do not use this application with real customer data until authentication, server-side authorization, gym-scoped database policies, tenant isolation tests and payment integrity controls are implemented and verified. Every gym-owned database record must be scoped by gym ID. Frontend filtering alone is not security.

## Planned build sequence

1. Apply the additional multi-gym workspace index migration.
2. Verify multi-gym registration, approval, switching and per-gym data separation.
3. Finish multi-branch support within a single gym organization.
4. Add automated cross-tenant RLS integration tests and deployment hardening.


## Supabase database setup

See [docs/supabase-setup.md](docs/supabase-setup.md) for project configuration, environment variables, migration instructions and security notes. The initial schema is in `supabase/migrations/0001_initial_schema.sql`.
