-- GymOS Phase 1 security audit (READ-ONLY)
-- Run in the Supabase SQL Editor for the GymOS project.
-- This checks database configuration; it does NOT replace signed-in, cross-tenant tests.

-- 1) Every tenant/business table must have RLS enabled.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','gyms','gym_users','platform_plans','gym_subscriptions',
    'subscription_payments','gym_settings','members','membership_plans',
    'memberships','payments','attendance','audit_logs'
  )
order by c.relname;

-- 2) Show policies, including command and role scope.
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Check that anon has no table privileges on protected public tables.
select
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'profiles','gyms','gym_users','platform_plans','gym_subscriptions',
    'subscription_payments','gym_settings','members','membership_plans',
    'memberships','payments','attendance','audit_logs'
  )
order by table_name, privilege_type;

-- 4) Confirm composite tenant foreign keys exist on core transactional tables.
select
  conrelid::regclass as table_name,
  conname as constraint_name,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where contype = 'f'
  and connamespace = 'public'::regnamespace
  and conrelid in (
    'public.memberships'::regclass,
    'public.payments'::regclass,
    'public.attendance'::regclass,
    'public.subscription_payments'::regclass
  )
order by conrelid::regclass::text, conname;

-- Interpretation:
-- * Result 1: all listed tables should show rls_enabled = true.
-- * Result 3: should return zero rows.
-- * Result 4: memberships -> members/plans, payments -> members/memberships,
--   attendance -> members, and subscription_payments -> gym_subscriptions
--   should each show a composite (gym_id, ...) foreign key.
-- * Result 2 needs human review. These catalog checks do not prove isolation
--   against real authenticated sessions. Do not treat them as a production security sign-off.
