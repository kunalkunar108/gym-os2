# GymOS

Multi-tenant gym management SaaS for independent gyms in India.

## Product direction

GymOS gives each gym an isolated workspace to manage members, membership plans, renewals, member payments, receipts, attendance and staff. A separate platform super-admin workflow will manage gym approval and GymOS subscription verification.

## Technology

- Next.js App Router
- React + TypeScript
- Tailwind CSS v4
- Supabase Auth and PostgreSQL (planned integration)
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

The first commit series establishes the Next.js project, a responsive dashboard shell, PWA manifest, shared domain types and configuration. Dashboard figures are intentionally placeholders; no real gym data or authentication is connected yet.

## Security release blockers

Do not use this application with real customer data until authentication, server-side authorization, gym-scoped database policies, tenant isolation tests and payment integrity controls are implemented and verified. Every gym-owned database record must be scoped by gym ID. Frontend filtering alone is not security.

## Planned build sequence

1. Supabase project setup, schema, authentication and tenant isolation.
2. Gym registration, approval workflow and platform super-admin.
3. Members, plans, memberships, renewals and payment records.
4. Attendance, receipts, staff permissions and audit logging.
5. GymOS subscription tracking, manual payment verification, tests and deployment hardening.
