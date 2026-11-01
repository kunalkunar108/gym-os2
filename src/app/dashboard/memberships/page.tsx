import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { assignMembership } from "./actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

function todayInIndia() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export default async function MembershipsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: access } = await supabase.from("gym_users").select("gym_id")
    .eq("user_id", user.id).eq("status", "active").in("role", ["owner", "staff"]).limit(10);
  if (!access?.length) redirect("/onboarding");
  const { data: gyms } = await supabase.from("gyms").select("id,name")
    .in("id", access.map((item) => item.gym_id)).eq("approval_status", "approved")
    .order("created_at", { ascending: false }).limit(1);
  const gym = gyms?.[0];
  if (!gym) redirect("/onboarding");

  const [{ data: members, error: membersError }, { data: plans, error: plansError }, { data: memberships, error: historyError }] = await Promise.all([
    supabase.from("members").select("id,member_code,full_name,status").eq("gym_id", gym.id).eq("status", "active").order("full_name").limit(500),
    supabase.from("membership_plans").select("id,name,duration_days,price").eq("gym_id", gym.id).eq("is_active", true).order("price").limit(200),
    supabase.from("memberships").select("id,member_id,plan_id,start_date,end_date,price_snapshot,status").eq("gym_id", gym.id).order("created_at", { ascending: false }).limit(200),
  ]);

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const planNames = new Map((plans ?? []).map((p) => [p.id, p.name]));
  const today = todayInIndia();
  const activeNow = (memberships ?? []).filter((m) => m.status === "active" && m.start_date <= today && m.end_date >= today).length;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">Member memberships</h1><p className="mt-2 text-sm text-[var(--muted)]">Assign plans and track membership dates and history.</p></div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Active today</p><p className="mt-1 text-xl font-semibold">{activeNow}</p></div>
        </div>
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.success}</p>}
        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center gap-2"><CalendarDays size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Assign a membership</h2></div>
            {membersError || plansError ? <p className="text-sm text-red-300">Could not load members or plans. Refresh the page.</p> : !members?.length ? <p className="text-sm text-[var(--muted)]">Add an active member first. <Link className="text-[var(--accent)] underline" href="/dashboard/members">Go to members</Link>.</p> : !plans?.length ? <p className="text-sm text-[var(--muted)]">Create an active plan first. <Link className="text-[var(--accent)] underline" href="/dashboard/plans">Go to plans</Link>.</p> : (
              <form action={assignMembership} className="space-y-4">
                <label className="block text-sm">Member<select name="member_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="" disabled>Select a member</option>{members.map((m) => <option key={m.id} value={m.id}>{m.full_name} · {m.member_code}</option>)}</select></label>
                <label className="block text-sm">Plan<select name="plan_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="" disabled>Select a plan</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.duration_days} days · {money(Number(p.price))}</option>)}</select></label>
                <label className="block text-sm">Start date<input name="start_date" type="date" required defaultValue={today} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"/></label>
                <p className="text-xs text-[var(--muted)]">End date is calculated automatically. The plan price is saved as a snapshot and will not change if you edit the plan later.</p>
                <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black">Assign membership</button>
              </form>
            )}
          </div>
          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2"><Users size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Membership history</h2></div>
            {historyError ? <p className="mt-6 text-sm text-red-300">Could not load history: {historyError.message}</p> : !memberships?.length ? <div className="py-14 text-center"><CalendarDays size={28} className="mx-auto text-[var(--muted)]"/><p className="mt-3 font-medium">No memberships assigned yet</p></div> : (
              <div className="mt-5 space-y-3">
                {memberships.map((m) => {
                  const current = m.status === "active" && m.start_date <= today && m.end_date >= today;
                  const expired = m.end_date < today || m.status === "expired";
                  return <article key={m.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-medium">{memberNames.get(m.member_id) ?? "Member record"}</p><p className="mt-1 text-sm text-[var(--muted)]">{planNames.get(m.plan_id) ?? "Plan record"}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs ${current ? "bg-emerald-500/10 text-emerald-300" : expired ? "bg-white/10 text-[var(--muted)]" : "bg-amber-500/10 text-amber-300"}`}>{current ? "Active" : expired ? "Expired" : m.status === "cancelled" ? "Cancelled" : "Upcoming"}</span></div>
                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><div><p className="text-xs text-[var(--muted)]">Start</p><p className="mt-1">{m.start_date}</p></div><div><p className="text-xs text-[var(--muted)]">End</p><p className="mt-1">{m.end_date}</p></div><div><p className="text-xs text-[var(--muted)]">Plan price</p><p className="mt-1">{money(Number(m.price_snapshot))}</p></div></div>
                  </article>;
                })}
              </div>
            )}
            <p className="mt-5 text-xs text-[var(--muted)]">Latest 200 records. Renewals create a new history record instead of overwriting the previous membership.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
