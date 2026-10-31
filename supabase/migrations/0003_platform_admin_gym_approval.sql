-- Platform admin actions for gym registration review.
-- The first platform admin must be bootstrapped manually in Supabase SQL Editor.
-- Never expose a service-role key to the browser.

create or replace function public.admin_set_gym_approval(
  target_gym_id uuid,
  decision text,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_admin uuid := auth.uid();
begin
  if current_admin is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected' using errcode = '22023';
  end if;

  if decision = 'rejected' and (reason is null or char_length(trim(reason)) < 5) then
    raise exception 'Please provide a rejection reason of at least 5 characters' using errcode = '22023';
  end if;

  update public.gyms
  set approval_status = decision,
      rejection_reason = case when decision = 'rejected' then trim(reason) else null end,
      approved_at = case when decision = 'approved' then now() else null end,
      approved_by = case when decision = 'approved' then current_admin else null end
  where id = target_gym_id
    and approval_status = 'pending';

  if not found then
    raise exception 'Pending gym registration not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs (gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    target_gym_id,
    current_admin,
    case when decision = 'approved' then 'gym.approved' else 'gym.rejected' end,
    'gym',
    target_gym_id,
    jsonb_build_object('reason', case when decision = 'rejected' then trim(reason) else null end)
  );
end;
$$;

revoke all on function public.admin_set_gym_approval(uuid, text, text) from public, anon;
grant execute on function public.admin_set_gym_approval(uuid, text, text) to authenticated;
