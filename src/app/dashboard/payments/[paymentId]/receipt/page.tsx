import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintReceiptButton from "./print-button";

export default async function PaymentReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gym } = await supabase.from("gyms").select("id,name").eq("owner_user_id", user.id).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!gym) redirect("/onboarding");

  const { data: payment } = await supabase.from("payments").select("id,member_id,membership_id,amount,method,receipt_number,note,created_at").eq("id", paymentId).eq("gym_id", gym.id).maybeSingle();
  if (!payment) notFound();

  const [{ data: member }, { data: membership }] = await Promise.all([
    supabase.from("members").select("full_name,member_code,phone").eq("id", payment.member_id).eq("gym_id", gym.id).maybeSingle(),
    payment.membership_id
      ? supabase.from("memberships").select("plan_id,start_date,end_date").eq("id", payment.membership_id).eq("gym_id", gym.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data: plan } = membership?.plan_id
    ? await supabase.from("membership_plans").select("name").eq("id", membership.plan_id).eq("gym_id", gym.id).maybeSingle()
    : { data: null };

  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
  return (
    <main className="mx-auto max-w-xl p-6 md:p-10">
      <div className="print:hidden mb-6 flex items-center justify-between"><Link href="/dashboard/payments" className="text-sm underline">Back to payments</Link><PrintReceiptButton /></div>
      <article className="rounded-2xl border border-[var(--border)] bg-white p-8 text-slate-900 print:border-0 print:p-0">
        <div className="border-b border-dashed border-slate-300 pb-5 text-center"><p className="text-sm font-semibold tracking-wide">PAYMENT RECEIPT</p><h1 className="mt-2 text-2xl font-bold">{gym.name}</h1><p className="mt-1 text-xs text-slate-500">Member payment acknowledgement</p></div>
        <div className="mt-6 flex justify-between gap-4 text-sm"><span className="text-slate-500">Receipt number</span><strong>{payment.receipt_number}</strong></div>
        <div className="mt-3 flex justify-between gap-4 text-sm"><span className="text-slate-500">Date</span><strong>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(payment.created_at))}</strong></div>
        <div className="mt-6 border-t border-slate-200 pt-5"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Received from</p><p className="mt-2 text-lg font-semibold">{member?.full_name ?? "Member"}</p><p className="text-sm text-slate-500">{member?.member_code ?? ""}{member?.phone ? ` · ${member.phone}` : ""}</p></div>
        <div className="mt-6 space-y-3 border-y border-slate-200 py-5 text-sm">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Membership plan</span><strong>{plan?.name ?? "Membership"}</strong></div>
          {membership && <div className="flex justify-between gap-4"><span className="text-slate-500">Validity</span><strong>{membership.start_date} to {membership.end_date}</strong></div>}
          <div className="flex justify-between gap-4"><span className="text-slate-500">Payment method</span><strong className="capitalize">{payment.method.replace("_", " ")}</strong></div>
          {payment.note && <div className="flex justify-between gap-4"><span className="text-slate-500">Note</span><strong>{payment.note}</strong></div>}
        </div>
        <div className="mt-6 flex justify-between text-lg"><span className="font-semibold">Amount received</span><strong>{money.format(Number(payment.amount))}</strong></div>
        <p className="mt-10 text-center text-xs text-slate-500">This is a computer-generated receipt.</p>
      </article>
      <style>{`@media print { body { background: white !important; } }`}</style>
    </main>
  );
}
