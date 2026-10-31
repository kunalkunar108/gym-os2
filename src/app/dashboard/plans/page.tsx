import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BadgeIndianRupee, Clock3, Dumbbell, Layers3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createMembershipPlan, updateMembershipPlan } from "./actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function PlansPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym, error: gymError } = await supabase
    .from("gyms")
    .select("id,name,owner_user_id")
    .eq("owner_user_id", user.id)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (gymError || !gym) redirect("/onboarding");

  const { data: plans, error } = await supabase
    .from("membership_plans")
    .select("id,name,duration_days,price,is_active,created_at")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false });

  const activeCount = (plans ?? []).filter((plan) => plan.is_active).length;
  const money = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white"><ArrowLeft size={16}/> Dashboard</Link>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">Membership plans</h1><p className="mt-2 text-sm text-[var(--muted)]">Set the duration and price of the memberships your gym sells.</p></div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Total plans</p><p className="mt-1 text-xl font-semibold">{plans?.length ?? 0}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Active plans</p><p className="mt-1 text-xl font-semibold">{activeCount}</p></div>
          </div>
        </div>

        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.success}</p>}

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center gap-2"><Layers3 size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Create a plan</h2></div>
            <form action={createMembershipPlan} className="space-y-4">
              <label className="block text-sm">Plan name<input name="name" required minLength={2} maxLength={80} placeholder="e.g. Gold Membership" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <label className="block text-sm">Duration (days)<input name="duration_days" type="number" required min="1" max="3650" defaultValue="30" placeholder="e.g. 30, 90, 180, 365" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/><span className="mt-1 block text-xs text-[var(--muted)]">Examples: 30 days (1 month), 90 days (3 months), 180 days (6 months), 365 days (1 year).</span></label>
              <label className="block text-sm">Price (₹)<input name="price" type="number" required min="0" max="9999999999" step="0.01" placeholder="e.g. 1500" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <p className="text-xs text-[var(--muted)]">Plans are gym-specific. You can deactivate a plan instead of deleting it, preserving membership history.</p>
              <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black hover:opacity-90">Create plan</button>
            </form>
          </div>

          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2"><Dumbbell size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Your plans</h2></div>
            {error ? <p className="mt-6 text-sm text-red-300">Could not load plans: {error.message}</p> : !plans?.length ? <div className="py-14 text-center"><Layers3 size={28} className="mx-auto text-[var(--muted)]"/><p className="mt-3 font-medium">No membership plans yet</p><p className="mt-1 text-sm text-[var(--muted)]">Create your first plan using the form.</p></div> : (
              <div className="mt-5 space-y-3">
                {plans.map((plan) => (
                  <details key={plan.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <summary className="flex cursor-pointer list-none flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div><p className="font-medium">{plan.name}</p><p className="mt-1 flex items-center gap-3 text-xs text-[var(--muted)]"><span className="flex items-center gap-1"><Clock3 size={13}/>{plan.duration_days} days</span><span className="flex items-center gap-1"><BadgeIndianRupee size={13}/>{money(Number(plan.price))}</span></p></div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs ${plan.is_active ? "bg-emerald-500/10 text-emerald-300" : "bg-white/10 text-[var(--muted)]"}`}>{plan.is_active ? "Active" : "Inactive"}</span>
                    </summary>
                    <form action={updateMembershipPlan} className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                      <input type="hidden" name="plan_id" value={plan.id}/>
                      <label className="text-xs text-[var(--muted)]">Plan name<input name="name" required minLength={2} maxLength={80} defaultValue={plan.name} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Duration (days)<input name="duration_days" type="number" required min={1} max={3650} defaultValue={plan.duration_days} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Price (₹)<input name="price" type="number" required min={0} step="0.01" defaultValue={plan.price} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Availability<select name="is_active" defaultValue={String(plan.is_active)} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"><option value="true">Active</option><option value="false">Inactive</option></select></label>
                      <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black sm:col-span-2">Save changes</button>
                    </form>
                  </details>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
