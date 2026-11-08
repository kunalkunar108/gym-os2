import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";
import { submitGymSubscription } from "./actions";

type Params = Promise<{ error?: string; submitted?: string }>;

export default async function BillingPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const { supabase, gym, gymId, role } = await getActiveGymContext();
  if (role !== "owner") redirect("/dashboard");

  const [{ data: plans, error: plansError }, { data: subscriptions }, { data: payments }] = await Promise.all([
    supabase.from("platform_plans").select("id,code,name,setup_fee,monthly_fee,annual_fee,currency").eq("is_active", true).order("monthly_fee"),
    supabase.from("gym_subscriptions").select("id,plan_id,billing_cycle,status,period_start,period_end,created_at").eq("gym_id", gymId).order("created_at", { ascending: false }),
    supabase.from("subscription_payments").select("id,subscription_id,amount,currency,method,reference,verification_status,admin_note,created_at").eq("gym_id", gymId).order("created_at", { ascending: false }).limit(30),
  ]);
  const planMap = new Map((plans ?? []).map(p => [p.id, p.name]));
  const activeSubscription = (subscriptions ?? []).find(s => s.status === "active");
  const pendingSubscription = (subscriptions ?? []).find(s => s.status === "pending");
  const errorMessages: Record<string,string> = {
    invalid: "Check the selected plan and payment details.",
    pending: "You already have a payment awaiting verification.",
    active: "Your subscription is active. You can renew after it expires.",
    submit_failed: "We could not submit the request. Make sure migration 0008 has been applied, then try again.",
  };

  return <main className="min-h-screen">
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
      <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
    </header>
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">GymOS platform billing</p>
      <h1 className="mt-2 text-3xl font-semibold">Subscription & billing</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">This subscription pays for GymOS access. It is separate from payments collected from your gym members.</p>
      {params.submitted && <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">Payment submitted. Your GymOS subscription will activate only after the platform team verifies it.</p>}
      {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{errorMessages[params.error] || "Something went wrong."}</p>}
      <section className="mt-7 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <p className="text-xs text-[var(--muted)]">Current status</p><p className="mt-2 text-2xl font-semibold capitalize">{activeSubscription?.status ?? pendingSubscription?.status ?? "No subscription"}</p>
          {activeSubscription && <p className="mt-2 text-sm text-[var(--muted)]">Valid until {activeSubscription.period_end ? new Date(activeSubscription.period_end + "T00:00:00").toLocaleDateString("en-IN") : "date not set"}</p>}
          {pendingSubscription && <p className="mt-2 text-sm text-amber-300">Your payment is awaiting review.</p>}
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center gap-2"><ShieldCheck size={18} className="text-[var(--accent)]"/><p className="font-medium">Manual payment verification</p></div><p className="mt-2 text-sm text-[var(--muted)]">Submit your UPI transaction ID or bank reference. Access activates after GymOS admin verification.</p></div>
      </section>

      {!activeSubscription && !pendingSubscription && (
        <section className="mt-9">
          <h2 className="text-xl font-semibold">Choose a subscription plan</h2>
          {plansError && <p className="mt-3 text-sm text-red-300">Could not load plans: {plansError.message}</p>}
          {!plansError && (plans ?? []).length === 0 && <p className="mt-3 rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">No GymOS plans are published yet. Please contact GymOS support.</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {(plans ?? []).map(plan => <article key={plan.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{plan.code}</p>
              <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-[var(--muted)]">Monthly</p><p className="text-xl font-semibold">₹{Number(plan.monthly_fee).toLocaleString("en-IN")}</p></div><div><p className="text-xs text-[var(--muted)]">Annual</p><p className="text-xl font-semibold">₹{Number(plan.annual_fee).toLocaleString("en-IN")}</p></div></div>
              {Number(plan.setup_fee) > 0 && <p className="mt-2 text-xs text-[var(--muted)]">One-time setup fee: ₹{Number(plan.setup_fee).toLocaleString("en-IN")} (added to your first payment)</p>}
              <form action={submitGymSubscription} className="mt-5 space-y-3 border-t border-[var(--border)] pt-4">
                <input type="hidden" name="gymId" value={gym.id}/><input type="hidden" name="planId" value={plan.id}/>
                <label className="block text-xs text-[var(--muted)]">Billing cycle<select name="billingCycle" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"><option value="monthly">Monthly — ₹{Number(plan.monthly_fee).toLocaleString("en-IN")}</option><option value="annual">Annual — ₹{Number(plan.annual_fee).toLocaleString("en-IN")}</option></select></label>
                <label className="block text-xs text-[var(--muted)]">Payment method<select name="method" required className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash (to GymOS representative)</option></select></label>
                <label className="block text-xs text-[var(--muted)]">UPI transaction ID / bank reference<input name="reference" required minLength={2} maxLength={160} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white" placeholder="Enter payment reference"/></label>
                <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black">Submit payment for verification</button>
              </form>
            </article>)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Payment & subscription history</h2>
        <div className="space-y-3">
          {(payments ?? []).length === 0 && <p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">No platform subscription payments yet.</p>}
          {(payments ?? []).map(payment => <article key={payment.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">₹{Number(payment.amount).toLocaleString("en-IN")}</p><span className="text-xs capitalize text-[var(--muted)]">{payment.verification_status.replace("_"," ")}</span></div>
            <p className="mt-1 text-xs text-[var(--muted)]">{planMap.get((subscriptions ?? []).find(s=>s.id===payment.subscription_id)?.plan_id ?? "") ?? "GymOS plan"} · {payment.method.replace("_"," ")} · {payment.reference}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{new Date(payment.created_at).toLocaleString("en-IN", {dateStyle:"medium",timeStyle:"short"})}</p>
            {payment.admin_note && <p className="mt-2 text-xs text-red-300">Admin note: {payment.admin_note}</p>}
          </article>)}
        </div>
      </section>
    </div>
  </main>;
}
