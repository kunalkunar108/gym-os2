-- GymOS subscription checkout and activation integrity
-- Apply after migration 0007.

create or replace function public.owner_submit_gym_subscription(
  target_gym_id uuid,
  target_plan_id uuid,
  target_billing_cycle text,
  payment_method text,
  payment_reference text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_plan public.platform_plans%rowtype;
  new_subscription_id uuid;
  payment_amount numeric(12,2);
  prior_subscription_exists boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.has_gym_role(target_gym_id, array['owner']) then
    raise exception 'Gym owner access required' using errcode = '42501';
  end if;

  if target_billing_cycle not in ('monthly', 'annual') then
    raise exception 'Invalid billing cycle' using errcode = '22023';
  end if;

  if payment_method not in ('upi', 'bank_transfer', 'cash') then
    raise exception 'Invalid payment method' using errcode = '22023';
  end if;

  if payment_reference is null or char_length(trim(payment_reference)) not between 2 and 160 then
    raise exception 'Enter a valid payment reference' using errcode = '22023';
  end if;

  perform 1 from public.gyms where id = target_gym_id for update;
  if not found then
    raise exception 'Gym not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.gym_subscriptions
    where gym_id = target_gym_id
      and status = 'pending'
  ) then
    raise exception 'A subscription request is already awaiting review' using errcode = '23505';
  end if;

  if exists (
    select 1 from public.gym_subscriptions
    where gym_id = target_gym_id
      and status = 'active'
      and (period_end is null or period_end >= current_date)
  ) then
    raise exception 'Your subscription is already active. Renew after its expiry.' using errcode = '23505';
  end if;

  select * into selected_plan
  from public.platform_plans
  where id = target_plan_id and is_active = true;

  if not found then
    raise exception 'Selected plan is unavailable' using errcode = 'P0002';
  end if;

  select exists (
    select 1 from public.gym_subscriptions where gym_id = target_gym_id
  ) into prior_subscription_exists;

  payment_amount := case
    when target_billing_cycle = 'monthly' then selected_plan.monthly_fee
    else selected_plan.annual_fee
  end;

  if not prior_subscription_exists then
    payment_amount := payment_amount + selected_plan.setup_fee;
  end if;

  if payment_amount <= 0 then
    raise exception 'The selected plan has no payable amount. Contact GymOS support.' using errcode = '22023';
  end if;

  insert into public.gym_subscriptions (gym_id, plan_id, billing_cycle, status)
  values (target_gym_id, target_plan_id, target_billing_cycle, 'pending')
  returning id into new_subscription_id;

  insert into public.subscription_payments (
    gym_id, subscription_id, amount, method, reference, submitted_by
  ) values (
    target_gym_id, new_subscription_id, payment_amount, payment_method,
    trim(payment_reference), current_user_id
  );

  insert into public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_gym_id, current_user_id, 'gym_subscription.payment_submitted',
    'gym_subscription', new_subscription_id,
    jsonb_build_object('plan_id', target_plan_id, 'billing_cycle', target_billing_cycle, 'amount', payment_amount)
  );

  return new_subscription_id;
end;
$$;

revoke all on function public.owner_submit_gym_subscription(uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.owner_submit_gym_subscription(uuid, uuid, text, text, text)
  to authenticated;

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
  target_subscription_id uuid;
  target_cycle text;
  start_on date := current_date;
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
  returning gym_id, subscription_id into payment_gym_id, target_subscription_id;

  if not found then
    raise exception 'Pending subscription payment not found' using errcode = 'P0002';
  end if;

  if decision = 'verified' then
    select billing_cycle into target_cycle
    from public.gym_subscriptions
    where id = target_subscription_id and gym_id = payment_gym_id
    for update;

    if not found then
      raise exception 'Subscription record not found' using errcode = 'P0002';
    end if;

    update public.gym_subscriptions
    set status = 'active',
        period_start = start_on,
        period_end = case
          when target_cycle = 'monthly' then (start_on + interval '1 month - 1 day')::date
          else (start_on + interval '1 year - 1 day')::date
        end
    where id = target_subscription_id and gym_id = payment_gym_id;
  else
    update public.gym_subscriptions
    set status = 'cancelled'
    where id = target_subscription_id and gym_id = payment_gym_id;
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
    jsonb_build_object('review_note', nullif(trim(review_note), ''), 'subscription_id', target_subscription_id)
  );
end;
$$;

revoke all on function public.admin_review_subscription_payment(uuid, text, text)
  from public, anon;
grant execute on function public.admin_review_subscription_payment(uuid, text, text)
  to authenticated;
