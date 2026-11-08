import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Clock3, UserCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";
import { checkInMember, checkOutMember } from "./actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

function dateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, gym } = await getActiveGymContext();

  const [{ data: members, error: membersError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase.from("members").select("id,member_code,full_name,status").eq("gym_id", gym.id).eq("status", "active").order("full_name").limit(500),
    supabase.from("attendance").select("id,member_id,checked_in_at,checked_out_at,recorded_by,note").eq("gym_id", gym.id).order("checked_in_at", { ascending: false }).limit(300),
  ]);

  const memberMap = new Map((members ?? []).map((member) => [member.id, member]));
  const active = (attendance ?? []).filter((entry) => !entry.checked_out_at);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const todayCount = (attendance ?? []).filter((entry) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(entry.checked_in_at)) === today
  ).length;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">Attendance</h1><p className="mt-2 text-sm text-[var(--muted)]">Check members in and out and review recent attendance.</p></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Checked in now</p><p className="mt-1 text-xl font-semibold">{active.length}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Today's check-ins</p><p className="mt-1 text-xl font-semibold">{todayCount}</p></div>
          </div>
        </div>
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.success}</p>}
        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center gap-2"><UserCheck size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Check in a member</h2></div>
            {membersError ? <p className="text-sm text-red-300">Could not load members: {membersError.message}</p> : !members?.length ? <p className="text-sm text-[var(--muted)]">No active members found. Add a member first.</p> : (
              <form action={checkInMember} className="space-y-4">
                <label className="block text-sm">Member<select name="member_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="" disabled>Select a member</option>{members.map((member) => <option key={member.id} value={member.id}>{member.full_name} · {member.member_code}</option>)}</select></label>
                <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black">Check in</button>
              </form>
            )}
            <p className="mt-4 text-xs text-[var(--muted)]">A member can have only one open check-in at a time. Check them out before recording another visit.</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2"><Users size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Currently checked in</h2></div>
            {!active.length ? <p className="py-10 text-center text-sm text-[var(--muted)]">No members are currently checked in.</p> : <div className="mt-5 space-y-3">{active.map((entry) => {
              const member = memberMap.get(entry.member_id);
              return <article key={entry.id} className="flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 sm:flex-row sm:items-center">
                <div><p className="font-medium">{member?.full_name ?? "Member record"}</p><p className="mt-1 text-xs text-[var(--muted)]">{member?.member_code ?? ""} · In at {dateTime(entry.checked_in_at)}</p></div>
                <form action={checkOutMember}><input type="hidden" name="attendance_id" value={entry.id}/><button className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">Check out</button></form>
              </article>;
            })}</div>}
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="flex items-center gap-2"><Clock3 size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Recent attendance history</h2></div>
          {attendanceError ? <p className="mt-4 text-sm text-red-300">{attendanceError.message}</p> : !attendance?.length ? <p className="py-10 text-center text-sm text-[var(--muted)]">No attendance recorded yet.</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="pb-3 pr-4 font-medium">Member</th><th className="pb-3 pr-4 font-medium">Check-in</th><th className="pb-3 pr-4 font-medium">Check-out</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{attendance.map((entry) => {
            const member = memberMap.get(entry.member_id);
            return <tr key={entry.id} className="border-t border-[var(--border)]"><td className="py-3 pr-4">{member?.full_name ?? "Member record"}</td><td className="py-3 pr-4">{dateTime(entry.checked_in_at)}</td><td className="py-3 pr-4">{entry.checked_out_at ? dateTime(entry.checked_out_at) : "—"}</td><td className="py-3">{entry.checked_out_at ? "Completed" : "Checked in"}</td></tr>;
          })}</tbody></table></div>}
          <p className="mt-4 text-xs text-[var(--muted)]">Latest 300 records. Duplicate open check-ins are blocked by a database constraint.</p>
        </section>
      </div>
    </main>
  );
}
