-- Fix receipt generation without depending on pgcrypto being on the function search_path.
-- gen_random_uuid() is already used by this RPC and is available in supported Supabase Postgres versions.

create or replace function public.record_member_payment(
  target_gym_id uuid,
  target_membership_id uuid,
  payment_amount numeric,
  payment_method text,
  payment_note text default null
)
returns table(payment_id uuid, generated_receipt_number text, remaining_balance numeric)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  membership_row public.memberships%rowtype;
  member_status text;
  already_paid numeric(12,2);
  new_payment_id uuid := gen_random_uuid();
  new_receipt text;
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.can_access_gym(target_gym_id)
     or not private.has_gym_role(target_gym_id, array['owner', 'staff']) then
    raise exception 'Gym owner or staff access required' using errcode = '42501';
  end if;

  if payment_amount is null or payment_amount <= 0
     or payment_amount <> round(payment_amount, 2) then
    raise exception 'Enter a valid payment amount with up to two decimal places' using errcode = '22023';
  end if;

  if payment_method not in ('cash', 'upi', 'bank_transfer', 'card', 'other') then
    raise exception 'Select a valid payment method' using errcode = '22023';
  end if;

  select m.* into membership_row
  from public.memberships m
  where m.id = target_membership_id
    and m.gym_id = target_gym_id
  for update;

  if not found or membership_row.status = 'cancelled' then
    raise exception 'Valid non-cancelled membership not found' using errcode = 'P0002';
  end if;

  select m.status into member_status
  from public.members m
  where m.id = membership_row.member_id
    and m.gym_id = target_gym_id;

  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  select coalesce(sum(p.amount), 0)::numeric(12,2) into already_paid
  from public.payments p
  where p.gym_id = target_gym_id
    and p.membership_id = target_membership_id;

  if already_paid + payment_amount > membership_row.price_snapshot then
    raise exception 'Payment exceeds the remaining membership balance of %',
      greatest(membership_row.price_snapshot - already_paid, 0)
      using errcode = '22023';
  end if;

  new_receipt := 'RCP-' || to_char(now() at time zone 'Asia/Kolkata', 'YYYYMMDD')
    || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.payments (
    id, gym_id, member_id, membership_id, amount, method,
    receipt_number, note, received_by
  ) values (
    new_payment_id, target_gym_id, membership_row.member_id,
    target_membership_id, payment_amount, payment_method,
    new_receipt, nullif(left(trim(coalesce(payment_note, '')), 300), ''),
    current_user_id
  );

  insert into public.audit_logs (
    gym_id, actor_id, action, entity_type, entity_id, metadata
  ) values (
    target_gym_id, current_user_id, 'member_payment.recorded',
    'payment', new_payment_id,
    jsonb_build_object(
      'membership_id', target_membership_id,
      'amount', payment_amount,
      'method', payment_method,
      'receipt_number', new_receipt
    )
  );

  return query select new_payment_id, new_receipt,
    (membership_row.price_snapshot - already_paid - payment_amount)::numeric(12,2);
end;
$$;

revoke all on function public.record_member_payment(uuid, uuid, numeric, text, text)
  from public, anon;
grant execute on function public.record_member_payment(uuid, uuid, numeric, text, text)
  to authenticated;
