-- GymOS staff invitations and owner-controlled access.
-- Apply after migrations 0001-0009.

create table public.gym_staff_invitations (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms(id) on delete cascade,
  email text not null check (email = lower(trim(email))),
  token_hash text not null unique,
  invited_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index gym_staff_invitations_gym_created_idx
  on public.gym_staff_invitations(gym_id, created_at desc);

alter table public.gym_staff_invitations enable row level security;

create policy "Owners view staff invitations"
on public.gym_staff_invitations for select to authenticated
using (private.has_gym_role(gym_id, array['owner']));

grant select on public.gym_staff_invitations to authenticated;
revoke insert, update, delete on public.gym_staff_invitations from anon, authenticated;

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
  raw_token text := encode(gen_random_bytes(24), 'hex');
begin
  if auth.uid() is null
     or not private.has_gym_role(target_gym_id, array['owner'])
     or not exists (
       select 1 from public.gyms g
       where g.id = target_gym_id and g.approval_status = 'approved'
     ) then
    raise exception 'Gym owner access required' using errcode = '42501';
  end if;

  if clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$' then
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
    target_gym_id, clean_email, encode(digest(raw_token, 'sha256'), 'hex'),
    auth.uid(), now() + interval '7 days'
  );

  insert into public.audit_logs(gym_id, actor_id, action, entity_type, metadata)
  values (target_gym_id, auth.uid(), 'staff.invited', 'gym_staff_invitation',
    jsonb_build_object('email', clean_email, 'expires_in_days', 7));

  return raw_token;
end;
$$;

create or replace function public.claim_gym_staff_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  invitation public.gym_staff_invitations%rowtype;
begin
  if current_user_id is null or current_email = '' then
    raise exception 'Sign in with the invited email address first' using errcode = '42501';
  end if;

  if invitation_token is null or length(invitation_token) <> 48 then
    raise exception 'Invitation link is invalid or expired' using errcode = '22023';
  end if;

  select * into invitation
  from public.gym_staff_invitations i
  where i.token_hash = encode(digest(invitation_token, 'sha256'), 'hex')
    and i.email = current_email
    and i.accepted_at is null
    and i.revoked_at is null
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation link is invalid, expired, or belongs to another email' using errcode = 'P0002';
  end if;

  insert into public.gym_users(gym_id, user_id, role, status, created_by)
  values (invitation.gym_id, current_user_id, 'staff', 'active', invitation.invited_by)
  on conflict (gym_id, user_id) do update
    set role = 'staff', status = 'active', created_by = excluded.created_by;

  update public.gym_staff_invitations
  set accepted_at = now()
  where id = invitation.id;

  insert into public.audit_logs(gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (invitation.gym_id, current_user_id, 'staff.invitation_accepted',
    'gym_staff_invitation', invitation.id, jsonb_build_object('email', current_email));

  return invitation.gym_id;
end;
$$;

create or replace function public.set_gym_staff_status(
  target_gym_id uuid,
  target_user_id uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or not private.has_gym_role(target_gym_id, array['owner']) then
    raise exception 'Gym owner access required' using errcode = '42501';
  end if;

  if new_status not in ('active', 'disabled') then
    raise exception 'Staff status must be active or disabled' using errcode = '22023';
  end if;

  update public.gym_users
  set status = new_status
  where gym_id = target_gym_id
    and user_id = target_user_id
    and role = 'staff';

  if not found then
    raise exception 'Staff account not found' using errcode = 'P0002';
  end if;

  insert into public.audit_logs(gym_id, actor_id, action, entity_type, entity_id, metadata)
  values (target_gym_id, auth.uid(),
    case when new_status = 'active' then 'staff.reactivated' else 'staff.disabled' end,
    'gym_user', target_user_id, jsonb_build_object('status', new_status));
end;
$$;

revoke all on function public.create_gym_staff_invitation(uuid, text) from public, anon;
revoke all on function public.claim_gym_staff_invitation(text) from public, anon;
revoke all on function public.set_gym_staff_status(uuid, uuid, text) from public, anon;
grant execute on function public.create_gym_staff_invitation(uuid, text) to authenticated;
grant execute on function public.claim_gym_staff_invitation(text) to authenticated;
grant execute on function public.set_gym_staff_status(uuid, uuid, text) to authenticated;
