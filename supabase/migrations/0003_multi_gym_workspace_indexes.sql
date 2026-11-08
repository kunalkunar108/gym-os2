-- Multi-gym workspace support
-- The existing gym_users(gym_id, user_id) composite key already permits one
-- account to belong to multiple gyms. These indexes keep workspace resolution
-- efficient as an account and platform grow.
create index if not exists gym_users_user_status_gym_idx
  on public.gym_users(user_id, status, gym_id);

create index if not exists gyms_approval_created_idx
  on public.gyms(approval_status, created_at desc);

-- A user may own multiple gyms, but may only have one active owner membership
-- per gym (already guaranteed by the gym_users primary key).
-- No client-provided active gym is trusted by this migration; every request
-- must still be checked against gym_users and gyms.approval_status.
