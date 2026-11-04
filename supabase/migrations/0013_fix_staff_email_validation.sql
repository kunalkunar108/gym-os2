-- Fix the database-side email validation used by staff invitations.
-- The previous SQL used a doubled backslash before the dot, which does not
-- match ordinary addresses such as name@gmail.com with standard strings enabled.

create or replace function public.create_gym_staff_invitation(
  target_gym_id uuid,
  invite_email text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_email text := lower(trim(invite_email));
  raw_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null
     or not private.has_gym_role(target_gym_id, array['owner'])
     or not exists (
       select 1 from public.gyms g
       where g.id = target_gym_id and g.approval_status = 'approved'
     ) then
    raise exception 'Gym owner access required' using errcode = '42501';
  end if;

  if length(clean_email) > 254
     or clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid email address' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.gym_users gu
    join auth.users au on au.id = gu.user_id
    where gu.gym_id = target_gym_id
      and lower(au.email) = clean_email
      and gu.status = 'active'
  ) then
    raise exception 'This person is already an active gym user' using errcode = '23505';
  end if;

  update public.gym_staff_invitations
  set revoked_at = now()
  where gym_id = target_gym_id
    and email = clean_email
    and accepted_at is null
    and revoked_at is null;

  insert into public.gym_staff_invitations (
    gym_id, email, token_hash, invited_by, expires_at
  ) values (
    target_gym_id, clean_email,
    encode(extensions.digest(raw_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days'
  );

  insert into public.audit_logs(gym_id, actor_id, action, entity_type, metadata)
  values (target_gym_id, auth.uid(), 'staff.invited', 'gym_staff_invitation',
    jsonb_build_object('email', clean_email, 'expires_in_days', 7));

  return raw_token;
end;
$$;

revoke all on function public.create_gym_staff_invitation(uuid, text) from public, anon;
grant execute on function public.create_gym_staff_invitation(uuid, text) to authenticated;
