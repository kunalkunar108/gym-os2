-- GymOS Phase 1 security hardening
-- Apply after 0001, 0002 and 0003.
-- Keeps billing visibility available to gym owners while separating approval from billing.

-- 1) Preserve the intended billing visibility for pending/rejected gyms.
-- The existing SELECT policies intentionally use is_gym_user(), without requiring
-- gym approval. No change is needed: owners can see their own billing records.

-- 2) Remove broad client-side UPDATE access from subscription payment records.
drop policy if exists "Platform admins verify subscription payments"
  on public.subscription_payments;
revoke update on table public.subscription_payments from authenticated;

-- Owners may submit a payment, but cannot pre-fill an administrator's review note.
drop policy if exists "Owners submit platform subscription payments"
  on public.subscription_payments;

create policy "Owners submit platform subscription payments"
on public.subscription_payments for insert to authenticated
with check (
  private.has_gym_role(gym_id, array['owner'])
  and submitted_by = (select auth.uid())
  and verification_status = 'pending'
  and verified_by is null
  and verified_at is null
  and admin_note is null
);

-- Only this trusted function can review a platform subscription payment.
create or replace function public.admin_review_subscription_payment(
  target_payment_id uuid,
  decision text,
  review_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_admin uuid := auth.uid();
  payment_gym_id uuid;
begin
  if current_admin is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  if decision not in ('verified', 'rejected') then
    raise exception 'Decision must be verified or rejected' using errcode = '22023';
  end if;

  if decision = 'rejected'
     and (review_note is null or char_length(trim(review_note)) < 5) then
    raise exception 'A rejection note of at least 5 characters is required'
      using errcode = '22023';
  end if;

  update public.subscription_payments
  set verification_status = decision,
      verified_by = current_admin,
      verified_at = case when decision = 'verified' then now() else null end,
      admin_note = nullif(trim(review_note), '')
  where id = target_payment_id
    and verification_status = 'pending'
  returning gym_id into payment_gym_id;

  if not found then
    raise exception 'Pending subscription payment not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (
    gym_id, actor_id, action, entity_type, entity_id, metadata
  )
  values (
    payment_gym_id,
    current_admin,
    case when decision = 'verified'
      then 'subscription_payment.verified'
      else 'subscription_payment.rejected'
    end,
    'subscription_payment',
    target_payment_id,
    jsonb_build_object('review_note', nullif(trim(review_note), ''))
  );
end;
$$;

revoke all on function public.admin_review_subscription_payment(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_subscription_payment(uuid, text, text)
  to authenticated;

-- 3) Make membership history append-only from authenticated clients.
-- Renewals should create a new membership row rather than rewriting old terms.
drop policy if exists "Owners and staff update memberships" on public.memberships;
revoke update on table public.memberships from authenticated;

-- 4) Limit attendance updates to checkout time only.
drop policy if exists "Owners and staff update attendance" on public.attendance;
revoke update on table public.attendance from authenticated;
grant update (checked_out_at) on table public.attendance to authenticated;

create policy "Owners and staff check out attendance"
on public.attendance for update to authenticated
using (
  private.can_access_gym(gym_id)
  and private.has_gym_role(gym_id, array['owner', 'staff'])
)
with check (
  private.can_access_gym(gym_id)
  and private.has_gym_role(gym_id, array['owner', 'staff'])
);

-- 5) Limit member edits to ordinary profile fields.
-- Gym identity, member code, creator and creation timestamp stay fixed.
revoke update on table public.members from authenticated;
grant update (full_name, phone, email, status, notes)
  on table public.members to authenticated;

-- 6) Limit membership plan edits to plan details, never tenant identity.
revoke update on table public.membership_plans from authenticated;
grant update (name, duration_days, price, is_active)
  on table public.membership_plans to authenticated;

-- 7) Limit gym settings edits to configurable settings, never gym_id.
revoke update on table public.gym_settings from authenticated;
grant update (currency, time_zone, expiry_warning_days)
  on table public.gym_settings to authenticated;

-- Note: gym_subscriptions remains readable by active gym users even while a gym
-- is pending/rejected. Gym approval and GymOS billing are separate workflows.
-- No client write policy/grant is added for gym_subscriptions.
