import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { savePlatformPlan } from "./actions";

type Params = Promise<{ error?: string; saved?: string }>;

export default async function AdminPlansPage({searchParams}:{searchParams:Params}) {
  const params=await searchParams;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const {data:profile}=await supabase.from("profiles").select("platform_role").eq("id",user.id).maybeSingle();
  if(profile?.platform_role!=="super_admin") redirect("/dashboard");
  const {data:plans,error}=await supabase.from("platform_plans")
    .select("id,code,name,setup_fee,monthly_fee,annual_fee,currency,is_active,created_at")
    .order("created_at",{ascending:true});
  return <main className="min-h-screen">
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10"><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Platform plan catalogue</p></div><Link href="/admin" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Admin dashboard</Link></header>
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Super admin</p><h1 className="mt-2 text-3xl font-semibold">GymOS subscription plans</h1><p className="mt-2 text-sm text-[var(--muted)]">Set the prices shown to gym owners. Editing a plan does not change amounts on already-submitted payments.</p>
      {params.saved&&<p className="mt-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">Plan saved.</p>}
      {params.error&&<p role="alert" className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{params.error==="invalid"?"Check the plan code, name and prices. At least one billing price must be above zero.":"Could not save the plan. The code may already be in use."}</p>}
      {error&&<p className="mt-5 text-sm text-red-300">Could not load plans: {error.message}</p>}
      <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="flex items-center gap-2 font-semibold"><Plus size={17}/> Create a plan</h2>
        <PlanForm/>
      </section>
      <section className="mt-9 space-y-4"><h2 className="text-xl font-semibold">Existing plans</h2>
        {(plans??[]).map(plan=><article key={plan.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold">{plan.name}</h3><p className="text-xs text-[var(--muted)]">{plan.code}</p></div><span className={plan.is_active?"text-xs text-emerald-300":"text-xs text-[var(--muted)]"}>{plan.is_active?"Active":"Inactive"}</span></div>
          <PlanForm plan={plan}/>
        </article>)}
        {(plans??[]).length===0&&<p className="rounded-xl border border-[var(--border)] p-4 text-sm text-[var(--muted)]">No plans created. Add your first plan above.</p>}
      </section>
    </div>
  </main>;
}

function PlanForm({plan}:{plan?:{id:string;code:string;name:string;setup_fee:number;monthly_fee:number;annual_fee:number;is_active:boolean}}) {
 return <form action={savePlatformPlan} className="grid gap-3 sm:grid-cols-2">
  <input type="hidden" name="planId" value={plan?.id??""}/>
  <label className="text-xs text-[var(--muted)]">Plan code<input name="code" required maxLength={40} defaultValue={plan?.code??""} placeholder="starter" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"/></label>
  <label className="text-xs text-[var(--muted)]">Plan name<input name="name" required minLength={2} maxLength={80} defaultValue={plan?.name??""} placeholder="Starter" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"/></label>
  <label className="text-xs text-[var(--muted)]">One-time setup fee (₹)<input name="setupFee" type="number" min="0" step="0.01" required defaultValue={plan?.setup_fee??0} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"/></label>
  <label className="text-xs text-[var(--muted)]">Monthly fee (₹)<input name="monthlyFee" type="number" min="0" step="0.01" required defaultValue={plan?.monthly_fee??0} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"/></label>
  <label className="text-xs text-[var(--muted)]">Annual fee (₹)<input name="annualFee" type="number" min="0" step="0.01" required defaultValue={plan?.annual_fee??0} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"/></label>
  <label className="text-xs text-[var(--muted)]">Availability<select name="active" defaultValue={String(plan?.is_active??true)} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm text-white"><option value="true">Active — visible to gym owners</option><option value="false">Inactive — hidden from new purchases</option></select></label>
  <div className="sm:col-span-2"><button className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black">{plan?"Save plan changes":"Create plan"}</button></div>
 </form>;
}
