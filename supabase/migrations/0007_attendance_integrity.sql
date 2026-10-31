-- Attendance integrity: one open check-in per member per gym.
-- Historical completed visits are preserved.

create unique index if not exists attendance_one_open_checkin_per_member
on public.attendance (gym_id, member_id)
where checked_out_at is null;

