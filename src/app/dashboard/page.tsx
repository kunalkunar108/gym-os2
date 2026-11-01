import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dumbbell, LogOut, ShieldCheck, Users, Layers3, CalendarDays, Wallet, UserCheck, Settings2, CreditCard, Activity } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym, error } = await supabase
    .from("gyms")
    .select("id,name,approval_status,rejection_reason")
    .eq("owner_user_id", user.id)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return <main className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">We could not load your gym</h1><p className="mt-3 text-sm text-red-300">{error.message}</p></main>;
  }
  if (!gym) redirect("/onboarding");

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={20}/></span><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Gym operating system</p></div></div>
        <form action="/auth/signout" method="post"><button className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]"><LogOut size={14}/> Sign out</button></form>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Approved workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">{gym.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Your gym workspace is approved. Manage your members from one place.</p>
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/members" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><Users className="text-[var(--accent)]"/><h2 className="font-semibold">Member management</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Add members, search the directory and update member details or status.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Open members →</p>
          </Link>
          <Link href="/dashboard/plans" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><Layers3 className="text-[var(--accent)]"/><h2 className="font-semibold">Membership plans</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Create and manage monthly, quarterly, half-yearly and annual plans.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Manage plans →</p>
          </Link>
          <Link href="/dashboard/memberships" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><CalendarDays className="text-[var(--accent)]"/><h2 className="font-semibold">Member memberships</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Assign plans to members, calculate expiry dates and view membership history.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Manage memberships →</p>
          </Link>
          <Link href="/dashboard/payments" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><Wallet className="text-[var(--accent)]"/><h2 className="font-semibold">Payments & receipts</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Record member payments, track outstanding balances and print receipts.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Manage payments →</p>
          </Link>
          <Link href="/dashboard/attendance" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><UserCheck className="text-[var(--accent)]"/><h2 className="font-semibold">Attendance management</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Check members in and out, see who is currently inside and review attendance history.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Manage attendance →</p>
          </Link>
          <Link href="/dashboard/billing" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><CreditCard className="text-[var(--accent)]"/><h2 className="font-semibold">GymOS subscription</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">View platform plans, submit subscription payments and track verification.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">View billing →</p>
          </Link>
          <Link href="/dashboard/settings" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">
            <div className="flex items-center gap-3"><Settings2 className="text-[var(--accent)]"/><h2 className="font-semibold">Gym settings</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Configure currency, time zone and membership expiry warning defaults.</p>
            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">Manage settings →</p>
          </Link>
          <Link href="/dashboard/activity" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]">\n            <div className="flex items-center gap-3"><Activity className="text-[var(--accent)]"/><h2 className="font-semibold">Activity log</h2></div>\n            <p className="mt-3 text-sm text-[var(--muted)]">Review recent recorded actions in this gym workspace.</p>\n            <p className="mt-5 text-sm font-semibold text-[var(--accent)]">View activity →</p>\n          </Link>\n          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-3"><ShieldCheck className="text-[var(--accent)]"/><h2 className="font-semibold">Workspace access verified</h2></div>
            <p className="mt-3 text-sm text-[var(--muted)]">Gym data is protected by gym-level row-level security and server-side permission checks.</p>
          </section>
        </section>
      </div>
    </main>
  );
}
