-- Allow gym owners to see basic profile names for users in their own gym only.
create policy "Gym owners view their staff profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.gym_users owner_membership
    join public.gym_users staff_membership
      on staff_membership.gym_id = owner_membership.gym_id
    where owner_membership.user_id = (select auth.uid())
      and owner_membership.role = 'owner'
      and owner_membership.status = 'active'
      and staff_membership.user_id = profiles.id
      and staff_membership.role = 'staff'
  )
);
