import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ReceiptText, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { recordMemberPayment } from "./actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

function money(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(amount);
}

export default async function PaymentsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym } = await supabase.from("gyms").select("id,name").eq("owner_user_id", user.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!gym) redirect("/onboarding");

  const [{ data: memberships, error: membershipError }, { data: payments, error: paymentsError }] = await Promise.all([
    supabase.from("memberships").select("id,member_id,plan_id,start_date,end_date,price_snapshot,status").eq("gym_id", gym.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(500),
    supabase.from("payments").select("id,member_id,membership_id,amount,method,receipt_number,note,created_at").eq("gym_id", gym.id).order("created_at", { ascending: false }).limit(300),
  ]);

  const [{ data: members }, { data: plans }] = await Promise.all([
    supabase.from("members").select("id,full_name,member_code").eq("gym_id", gym.id),
    supabase.from("membership_plans").select("id,name").eq("gym_id", gym.id),
  ]);

  const memberNames = new Map((members ?? []).map((m) => [m.id, m.full_name]));
  const planNames = new Map((plans ?? []).map((p) => [p.id, p.name]));
  const paidByMembership = new Map<string, number>();
  for (const payment of payments ?? []) {
    if (payment.membership_id) paidByMembership.set(payment.membership_id, (paidByMembership.get(payment.membership_id) ?? 0) + Number(payment.amount));
  }

  const openMemberships = (memberships ?? []).map((membership) => ({
    ...membership,
    paid: paidByMembership.get(membership.id) ?? 0,
    due: Math.max(0, Number(membership.price_snapshot) - (paidByMembership.get(membership.id) ?? 0)),
  })).filter((membership) => membership.due > 0);

  const totalCollected = (payments ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">Payments & receipts</h1><p className="mt-2 text-sm text-[var(--muted)]">Record full or partial membership payments and print receipts.</p></div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Collected · latest 300</p><p className="mt-1 text-xl font-semibold">{money(totalCollected)}</p></div>
        </div>
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.success}</p>}

        <section className="mt-8 grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center gap-2"><Wallet size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Record a payment</h2></div>
            {membershipError ? <p className="text-sm text-red-300">Could not load memberships: {membershipError.message}</p> : !openMemberships.length ? <p className="text-sm text-[var(--muted)]">There are no outstanding membership balances. Assign a membership or check payment history.</p> : (
              <form action={recordMemberPayment} className="space-y-4">
                <label className="block text-sm">Member and membership<select name="membership_id" required defaultValue="" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="" disabled>Select membership</option>{openMemberships.map((m) => <option key={m.id} value={m.id}>{memberNames.get(m.member_id) ?? "Member"} · {planNames.get(m.plan_id) ?? "Plan"} · Due {money(m.due)}</option>)}</select></label>
                <label className="block text-sm">Amount (₹)<input name="amount" type="number" min="0.01" step="0.01" required placeholder="e.g. 500" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"/></label>
                <label className="block text-sm">Payment method<select name="method" required defaultValue="cash" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"><option value="cash">Cash</option><option value="upi">UPI</option><option value="bank_transfer">Bank transfer</option><option value="card">Card</option><option value="other">Other</option></select></label>
                <label className="block text-sm">Note (optional)<input name="note" maxLength={300} placeholder="Transaction reference or note" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm"/></label>
                <p className="text-xs text-[var(--muted)]">Payments are permanent records. Corrections should be handled through a separate reversal workflow, not by editing or deleting a receipt.</p>
                <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black">Record payment</button>
              </form>
            )}
          </div>

          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex items-center gap-2"><ReceiptText size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Payment history</h2></div>
            {paymentsError ? <p className="mt-6 text-sm text-red-300">Could not load payments: {paymentsError.message}</p> : !payments?.length ? <p className="py-14 text-center text-sm text-[var(--muted)]">No payments recorded yet.</p> : (
              <div className="mt-5 space-y-3">
                {payments.map((payment) => (
                  <article key={payment.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 print:break-inside-avoid">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row"><div><p className="font-medium">{memberNames.get(payment.member_id) ?? "Member record"}</p><p className="mt-1 text-xs text-[var(--muted)]">{payment.receipt_number}</p></div><p className="font-semibold">{money(Number(payment.amount))}</p></div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3"><div><p className="text-xs text-[var(--muted)]">Membership</p><p>{payment.membership_id ? planNames.get((memberships ?? []).find((m) => m.id === payment.membership_id)?.plan_id ?? "") ?? "Membership" : "General"}</p></div><div><p className="text-xs text-[var(--muted)]">Method</p><p>{payment.method.replace("_", " ")}</p></div><div><p className="text-xs text-[var(--muted)]">Date</p><p>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(payment.created_at))}</p></div></div>
                    {payment.note && <p className="mt-2 text-xs text-[var(--muted)]">Note: {payment.note}</p>}
                    <div className="mt-4 flex justify-end print:hidden"><a href={`/dashboard/payments/${payment.id}/receipt`} target="_blank" rel="noreferrer" className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium hover:border-[var(--accent)]">Open receipt</a></div>
                  </article>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs text-[var(--muted)]">Showing the latest 300 payment records. Payment records cannot be edited or deleted.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
