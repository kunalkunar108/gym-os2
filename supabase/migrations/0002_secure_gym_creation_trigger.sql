-- The gym insert trigger must create the owner's gym_users row and gym_settings row.
-- Those tables intentionally have no client insert grants/policies, so the trigger
-- runs as its trusted function owner rather than the calling authenticated user.
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

revoke all on function public.handle_new_gym() from public, anon, authenticated;
