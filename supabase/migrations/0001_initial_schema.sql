-- GymOS initial database foundation
-- Apply this migration to a new Supabase project using the SQL Editor or Supabase CLI.
-- Do not expose service_role keys to browser code.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  platform_role text not null default 'user' check (platform_role in ('user', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  owner_user_id uuid not null references public.profiles(id),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_user_id)
);

create table public.gym_users (
  gym_id uuid not null references public.gyms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner', 'staff')),
  status text not null default 'active' check (status in ('invited', 'active', 'disabled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  primary key (gym_id, user_id)
);

create table public.platform_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
  monthly_fee numeric(12,2) not null check (monthly_fee >= 0),
  annual_fee numeric(12,2) not null check (annual_fee >= 0),
  currency char(3) not null default 'INR',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.gym_subscriptions (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id),
  plan_id uuid not null references public.platform_plans(id),
  billing_cycle text not null check (billing_cycle in ('monthly', 'annual')),
  status text not null default 'pending' check (status in ('pending', 'trial', 'active', 'past_due', 'suspended', 'cancelled', 'expired')),
  period_start date,
  period_end date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, id),
  check (period_end is null or period_start is null or period_end >= period_start)
);

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  subscription_id uuid not null,
  amount numeric(12,2) not null check (amount > 0),
  currency char(3) not null default 'INR',
  method text not null check (method in ('upi', 'bank_transfer', 'cash')),
  reference text not null check (char_length(trim(reference)) between 2 and 160),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'verified', 'rejected')),
  submitted_by uuid not null references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  foreign key (gym_id, subscription_id) references public.gym_subscriptions(gym_id, id)
);

create table public.gym_settings (
  gym_id uuid primary key references public.gyms(id) on delete cascade,
  currency char(3) not null default 'INR',
  time_zone text not null default 'Asia/Kolkata',
  expiry_warning_days integer not null default 7 check (expiry_warning_days between 0 and 90),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id),
  member_code text not null,
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text not null,
  email text,
  status text not null default 'active' check (status in ('active', 'inactive', 'archived')),
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, id),
  unique (gym_id, member_code)
);

create table public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id),
  name text not null,
  duration_days integer not null check (duration_days between 1 and 3650),
  price numeric(12,2) not null check (price >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gym_id, id)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid not null,
  plan_id uuid not null,
  start_date date not null,
  end_date date not null,
  price_snapshot numeric(12,2) not null check (price_snapshot >= 0),
  status text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (gym_id, id),
  foreign key (gym_id, member_id) references public.members(gym_id, id),
  foreign key (gym_id, plan_id) references public.membership_plans(gym_id, id),
  check (end_date >= start_date)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid not null,
  membership_id uuid,
  amount numeric(12,2) not null check (amount > 0),
  method text not null check (method in ('cash', 'upi', 'bank_transfer', 'card', 'other')),
  receipt_number text not null,
  note text,
  received_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (gym_id, id),
  unique (gym_id, receipt_number),
  foreign key (gym_id, member_id) references public.members(gym_id, id),
  foreign key (gym_id, membership_id) references public.memberships(gym_id, id)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null,
  member_id uuid not null,
  checked_in_at timestamptz not null default now(),
  checked_out_at timestamptz,
  recorded_by uuid references public.profiles(id),
  note text,
  foreign key (gym_id, member_id) references public.members(gym_id, id),
  check (checked_out_at is null or checked_out_at >= checked_in_at)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms(id),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index gym_users_user_status_idx on public.gym_users(user_id, status);
create index gyms_owner_idx on public.gyms(owner_user_id);
create index gym_subscriptions_gym_status_idx on public.gym_subscriptions(gym_id, status);
create index subscription_payments_status_idx on public.subscription_payments(verification_status, created_at desc);
create index members_gym_name_idx on public.members(gym_id, full_name);
create index members_gym_phone_idx on public.members(gym_id, phone);
create index memberships_gym_member_dates_idx on public.memberships(gym_id, member_id, start_date, end_date);
create index payments_gym_created_idx on public.payments(gym_id, created_at desc);
create index attendance_gym_checked_in_idx on public.attendance(gym_id, checked_in_at desc);
create index audit_logs_gym_created_idx on public.audit_logs(gym_id, created_at desc);

create or replace function private.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.platform_role = 'super_admin'
  );
$$;

create or replace function private.is_gym_user(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gym_users gu
    where gu.gym_id = target_gym_id
      and gu.user_id = (select auth.uid())
      and gu.status = 'active'
  );
$$;

create or replace function private.has_gym_role(target_gym_id uuid, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.gym_users gu
    where gu.gym_id = target_gym_id
      and gu.user_id = (select auth.uid())
      and gu.status = 'active'
      and gu.role = any(allowed_roles)
  );
$$;

create or replace function private.can_access_gym(target_gym_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_platform_admin() or (
    private.is_gym_user(target_gym_id)
    and exists (
      select 1 from public.gyms g
      where g.id = target_gym_id and g.approval_status = 'approved'
    )
  );
$$;

grant execute on all functions in schema private to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger gyms_set_updated_at before update on public.gyms
for each row execute function public.set_updated_at();
create trigger gym_subscriptions_set_updated_at before update on public.gym_subscriptions
for each row execute function public.set_updated_at();
create trigger gym_settings_set_updated_at before update on public.gym_settings
for each row execute function public.set_updated_at();
create trigger members_set_updated_at before update on public.members
for each row execute function public.set_updated_at();
create trigger membership_plans_set_updated_at before update on public.membership_plans
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.handle_new_gym()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.gym_users (gym_id, user_id, role, status, created_by)
  values (new.id, new.owner_user_id, 'owner', 'active', new.owner_user_id)
  on conflict (gym_id, user_id) do nothing;

  insert into public.gym_settings (gym_id)
  values (new.id)
  on conflict (gym_id) do nothing;

  return new;
end;
$$;

create trigger on_gym_created
after insert on public.gyms
for each row execute function public.handle_new_gym();

alter table public.profiles enable row level security;
alter table public.gyms enable row level security;
alter table public.gym_users enable row level security;
alter table public.platform_plans enable row level security;
alter table public.gym_subscriptions enable row level security;
alter table public.subscription_payments enable row level security;
alter table public.gym_settings enable row level security;
alter table public.members enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;

create policy "Profiles visible to self or platform admin"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_platform_admin());

create policy "Users can request a gym"
on public.gyms for insert to authenticated
with check (owner_user_id = (select auth.uid()) and approval_status = 'pending' and approved_by is null and approved_at is null);

create policy "Gym visible to its owner members and platform admin"
on public.gyms for select to authenticated
using (owner_user_id = (select auth.uid()) or private.is_gym_user(id) or private.is_platform_admin());

create policy "Gym users visible to self owner or platform admin"
on public.gym_users for select to authenticated
using (
  user_id = (select auth.uid())
  or private.has_gym_role(gym_id, array['owner'])
  or private.is_platform_admin()
);

create policy "Active platform plans visible"
on public.platform_plans for select to authenticated
using (is_active or private.is_platform_admin());

create policy "Gym subscription visible to gym users or platform admin"
on public.gym_subscriptions for select to authenticated
using (private.is_gym_user(gym_id) or private.is_platform_admin());

create policy "Owners submit platform subscription payments"
on public.subscription_payments for insert to authenticated
with check (
  private.has_gym_role(gym_id, array['owner'])
  and submitted_by = (select auth.uid())
  and verification_status = 'pending'
  and verified_by is null
  and verified_at is null
);

create policy "Subscription payments visible to gym users or platform admin"
on public.subscription_payments for select to authenticated
using (private.is_gym_user(gym_id) or private.is_platform_admin());

create policy "Platform admins verify subscription payments"
on public.subscription_payments for update to authenticated
using (private.is_platform_admin())
with check (private.is_platform_admin());

create policy "Gym settings visible to approved gym users"
on public.gym_settings for select to authenticated
using (private.can_access_gym(gym_id));

create policy "Gym owners update settings"
on public.gym_settings for update to authenticated
using (private.has_gym_role(gym_id, array['owner']) and private.can_access_gym(gym_id))
with check (private.has_gym_role(gym_id, array['owner']) and private.can_access_gym(gym_id));

create policy "Members readable by approved gym users"
on public.members for select to authenticated using (private.can_access_gym(gym_id));
create policy "Owners and staff create members"
on public.members for insert to authenticated
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']) and (created_by is null or created_by = (select auth.uid())));
create policy "Owners and staff update members"
on public.members for update to authenticated
using (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']))
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']));

create policy "Membership plans readable by approved gym users"
on public.membership_plans for select to authenticated using (private.can_access_gym(gym_id));
create policy "Owners manage membership plans"
on public.membership_plans for insert to authenticated
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner']));
create policy "Owners update membership plans"
on public.membership_plans for update to authenticated
using (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner']))
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner']));

create policy "Memberships readable by approved gym users"
on public.memberships for select to authenticated using (private.can_access_gym(gym_id));
create policy "Owners and staff create memberships"
on public.memberships for insert to authenticated
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']) and (created_by is null or created_by = (select auth.uid())));
create policy "Owners and staff update memberships"
on public.memberships for update to authenticated
using (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']))
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']));

create policy "Payments readable by approved gym users"
on public.payments for select to authenticated using (private.can_access_gym(gym_id));
create policy "Owners and staff record payments"
on public.payments for insert to authenticated
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']) and (received_by is null or received_by = (select auth.uid())));

create policy "Attendance readable by approved gym users"
on public.attendance for select to authenticated using (private.can_access_gym(gym_id));
create policy "Owners and staff record attendance"
on public.attendance for insert to authenticated
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']) and (recorded_by is null or recorded_by = (select auth.uid())));
create policy "Owners and staff update attendance"
on public.attendance for update to authenticated
using (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']))
with check (private.can_access_gym(gym_id) and private.has_gym_role(gym_id, array['owner', 'staff']));

create policy "Audit logs readable by approved gym users"
on public.audit_logs for select to authenticated
using (gym_id is not null and private.can_access_gym(gym_id) or private.is_platform_admin());

-- Intentionally no authenticated write policies for profiles, gym_users, platform_plans,
-- gym approval fields, audit_logs, or subscription creation. Trusted server-side code
-- using a server-only service role must perform those privileged operations.
