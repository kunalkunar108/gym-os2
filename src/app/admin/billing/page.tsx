import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { reviewSubscriptionPayment } from "./actions";

type Params = Promise<{ error?: string; updated?: string }>;

export default async function AdminBillingPage({ searchParams }: { searchParams: Params }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard");

  const { data: payments, error } = await supabase.from("subscription_payments")
    .select("id,gym_id,subscription_id,amount,currency,method,reference,verification_status,submitted_by,created_at")
    .eq("verification_status", "pending").order("created_at", { ascending: true }).limit(100);

  const gymIds = [...new Set((payments ?? []).map(p => p.gym_id))];
  const subscriptionIds = [...new Set((payments ?? []).map(p => p.subscription_id))];
  const [{ data: gyms }, { data: subscriptions }, { data: profiles }] = await Promise.all([
    gymIds.length ? supabase.from("gyms").select("id,name,slug").in("id", gymIds) : Promise.resolve({data:[]}),
    subscriptionIds.length ? supabase.from("gym_subscriptions").select("id,plan_id,billing_cycle").in("id", subscriptionIds) : Promise.resolve({data:[]}),
    (payments ?? []).length ? supabase.from("profiles").select("id,full_name").in("id", [...new Set((payments ?? []).map(p=>p.submitted_by))]) : Promise.resolve({data:[]}),
  ]);
  const plansIds = [...new Set((subscriptions ?? []).map(s=>s.plan_id))];
  const { data: plans } = plansIds.length ? await supabase.from("platform_plans").select("id,name").in("id", plansIds) : {data:[]};
  const gymMap = new Map((gyms ?? []).map(g=>[g.id,g]));
  const subMap = new Map((subscriptions ?? []).map(s=>[s.id,s]));
  const planMap = new Map((plans ?? []).map(p=>[p.id,p.name]));
  const profileMap = new Map((profiles ?? []).map(p=>[p.id,p.full_name || "Gym owner"]));

  return <main className="min-h-screen">
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10"><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Platform billing review</p></div><Link href="/admin" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Admin dashboard</Link></header>
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Super admin</p><h1 className="mt-2 text-3xl font-semibold">Subscription payment review</h1><p className="mt-2 text-sm text-[var(--muted)]">Verify payment against your UPI or bank statement before activating access.</p>
      {params.updated && <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">Payment review saved and subscription status updated.</p>}
      {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{params.error==="note_required"?"A rejection note of at least 5 characters is required.":"Could not complete the review. Check the migration and try again."}</p>}
      {error && <p className="mt-6 text-sm text-red-300">Could not load payments: {error.message}</p>}
      <div className="mt-8 flex items-center gap-2 text-sm text-[var(--muted)]"><Clock3 size={16}/>{payments?.length ?? 0} pending payment(s)</div>
      <section className="mt-4 space-y-4">
        {(payments ?? []).map(payment => {
          const gym = gymMap.get(payment.gym_id);
          const sub = subMap.get(payment.subscription_id);
          return <article key={payment.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{gym?.name ?? "Unknown gym"}</h2><p className="mt-1 text-xs text-[var(--muted)]">{gym?.slug ?? ""} · {profileMap.get(payment.submitted_by) ?? "Gym owner"}</p><p className="mt-3 text-sm">{planMap.get(sub?.plan_id ?? "") ?? "Plan"} · {sub?.billing_cycle ?? "Billing cycle"} billing</p></div><p className="text-xl font-semibold">₹{Number(payment.amount).toLocaleString("en-IN")}</p></div>
            <div className="mt-4 rounded-xl bg-[#0d1017] p-3 text-sm"><p>Method: <span className="capitalize">{payment.method.replace("_"," ")}</span></p><p className="mt-1 break-all">Reference: {payment.reference}</p><p className="mt-1 text-xs text-[var(--muted)]">Submitted {new Date(payment.created_at).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</p></div>
            <form action={reviewSubscriptionPayment} className="mt-4 space-y-3"><input type="hidden" name="paymentId" value={payment.id}/><label className="block text-xs text-[var(--muted)]">Review note (required when rejecting)<input name="note" maxLength={500} minLength={5} placeholder="Reason if payment cannot be verified" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm"/></label><div className="flex flex-wrap gap-2"><button name="decision" value="verified" className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-black"><CheckCircle2 size={15}/> Verify & activate</button><button name="decision" value="rejected" className="rounded-xl border border-red-900 px-4 py-2.5 text-xs font-semibold text-red-300">Reject payment</button></div></form>
          </article>;
        })}
        {!error && (payments ?? []).length===0 && <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">No pending subscription payments.</div>}
      </section>
    </div>
  </main>;
}
