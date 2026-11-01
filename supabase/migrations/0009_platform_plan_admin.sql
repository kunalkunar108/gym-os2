-- GymOS platform plan administration
-- Apply after migration 0008.

create or replace function public.admin_save_platform_plan(
  target_plan_id uuid,
  plan_code text,
  plan_name text,
  setup_amount numeric,
  monthly_amount numeric,
  annual_amount numeric,
  active_flag boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_admin uuid := auth.uid();
  saved_id uuid;
  clean_code text := lower(trim(plan_code));
  clean_name text := trim(plan_name);
begin
  if current_admin is null or not private.is_platform_admin() then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;
  if clean_code !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(clean_code) > 40
     or char_length(clean_name) not between 2 and 80
     or setup_amount < 0 or monthly_amount < 0 or annual_amount < 0
     or setup_amount is null or monthly_amount is null or annual_amount is null
     or (monthly_amount = 0 and annual_amount = 0) then
    raise exception 'Enter a valid plan code, name and non-negative prices. At least one billing price must be greater than zero.' using errcode = '22023';
  end if;

  if target_plan_id is null then
    insert into public.platform_plans(code,name,setup_fee,monthly_fee,annual_fee,is_active)
    values(clean_code,clean_name,setup_amount,monthly_amount,annual_amount,active_flag)
    returning id into saved_id;
  else
    update public.platform_plans
    set code=clean_code,name=clean_name,setup_fee=setup_amount,
        monthly_fee=monthly_amount,annual_fee=annual_amount,is_active=active_flag
    where id=target_plan_id
    returning id into saved_id;
    if not found then
      raise exception 'Platform plan not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.audit_logs(gym_id,actor_id,action,entity_type,entity_id,metadata)
  values(null,current_admin,'platform_plan.saved','platform_plan',saved_id,
    jsonb_build_object('code',clean_code,'name',clean_name,'active',active_flag));
  return saved_id;
end;
$$;

revoke all on function public.admin_save_platform_plan(uuid,text,text,numeric,numeric,numeric,boolean)
  from public, anon;
grant execute on function public.admin_save_platform_plan(uuid,text,text,numeric,numeric,numeric,boolean)
  to authenticated;
