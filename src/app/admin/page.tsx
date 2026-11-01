import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewGym } from "./actions";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Dumbbell, ShieldCheck, Clock3, CheckCircle2, XCircle, LogOut } from "lucide-react";

type SearchParams = Promise<{ updated?: string; error?: string }>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("platform_role,full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.platform_role !== "super_admin") {
    redirect("/dashboard");
  }

  const [{ data: gyms, error }, params] = await Promise.all([
    supabase.from("gyms")
      .select("id,name,slug,owner_user_id,approval_status,rejection_reason,created_at")
      .order("created_at", { ascending: false }),
    searchParams,
  ]);

  if (error) {
    return <main className="mx-auto max-w-5xl p-8"><h1 className="text-2xl font-semibold">Could not load registrations</h1><p className="mt-3 text-sm text-red-300">{error.message}</p></main>;
  }

  const ownerIds = [...new Set((gyms ?? []).map(gym => gym.owner_user_id))];
  const { data: owners } = ownerIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", ownerIds)
    : { data: [] as { id: string; full_name: string | null }[] };
  const ownerNames = new Map((owners ?? []).map(owner => [owner.id, owner.full_name || "Gym owner"]));

  const pending = (gyms ?? []).filter(gym => gym.approval_status === "pending");
  const approved = (gyms ?? []).filter(gym => gym.approval_status === "approved");
  const rejected = (gyms ?? []).filter(gym => gym.approval_status === "rejected");

  const errorMessages: Record<string, string> = {
    invalid_request: "The selected registration is invalid.",
    invalid_decision: "The requested action is invalid.",
    reason_required: "A rejection reason of at least 5 characters is required.",
    review_failed: "The review could not be completed. Refresh and try again.",
  };

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-5 py-5 md:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={20}/></span>
          <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Platform administration</p></div>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-xs text-[var(--muted)] sm:block">{profile.full_name || user.email}</span>
          <form action="/auth/signout" method="post"><button className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]"><LogOut size={14}/> Sign out</button></form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Platform control centre</p><h1 className="mt-2 text-3xl font-semibold">Admin dashboard</h1><p className="mt-2 text-sm text-[var(--muted)]">Review gym applications and monitor platform registrations.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]"><ShieldCheck size={15} className="text-[var(--accent)]"/> Super admin</div>
        </div>

        {params.updated && <p className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">Registration review saved.</p>}
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{errorMessages[params.error] || "Something went wrong."}</p>}

        <div className="mt-6"><Link href="/admin/billing" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-3 text-sm hover:border-[var(--accent)]"><CreditCard size={16}/> Review subscription payments</Link></div>
        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Pending review" value={pending.length} icon={<Clock3 size={18}/>} />
          <Stat label="Approved gyms" value={approved.length} icon={<CheckCircle2 size={18}/>} />
          <Stat label="Rejected requests" value={rejected.length} icon={<XCircle size={18}/>} />
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Pending gym registrations</h2><span className="text-xs text-[var(--muted)]">{pending.length} awaiting decision</span></div>
          {pending.length === 0 ? (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center"><CheckCircle2 size={25} className="mx-auto text-[var(--accent)]"/><p className="mt-3 font-medium">No pending registrations</p><p className="mt-1 text-sm text-[var(--muted)]">New gym applications will appear here.</p></div>
          ) : (
            <div className="space-y-4">
              {pending.map(gym => (
                <article key={gym.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="text-lg font-semibold">{gym.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">Workspace: {gym.slug}</p><p className="mt-2 text-sm text-[var(--muted)]">Owner: {ownerNames.get(gym.owner_user_id) || "Gym owner"}</p><p className="mt-1 text-xs text-[var(--muted)]">Submitted: {new Date(gym.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</p></div>
                    <span className="rounded-full border border-amber-900/70 bg-amber-950/30 px-3 py-1 text-xs text-amber-300">Pending</span>
                  </div>
                  <div className="mt-5 grid gap-3 border-t border-[var(--border)] pt-5 md:grid-cols-[1fr_auto] md:items-end">
                    <form action={reviewGym} className="space-y-2">
                      <input type="hidden" name="gymId" value={gym.id}/>
                      <label className="block text-xs text-[var(--muted)]">Rejection reason (required only if rejecting)</label>
                      <input name="reason" minLength={5} maxLength={500} placeholder="Explain what needs to be corrected" className="w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"/>
                      <p className="text-[11px] text-[var(--muted)]">Approve only after verifying the gym and owner details outside this form.</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button name="decision" value="approved" className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-semibold text-black">Approve gym</button>
                        <button name="decision" value="rejected" className="rounded-xl border border-red-900 px-4 py-2.5 text-xs font-semibold text-red-300">Reject request</button>
                      </div>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold">Recent registrations</h2>
          <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
            {(gyms ?? []).length === 0 ? <p className="p-5 text-sm text-[var(--muted)]">No gym registrations found.</p> : (gyms ?? []).map(gym => (
              <div key={gym.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 last:border-0">
                <div><p className="text-sm font-medium">{gym.name}</p><p className="mt-1 text-xs text-[var(--muted)]">{gym.slug} · {ownerNames.get(gym.owner_user_id) || "Gym owner"}</p>{gym.rejection_reason && <p className="mt-1 text-xs text-red-300">Reason: {gym.rejection_reason}</p>}</div>
                <Status status={gym.approval_status}/>
              </div>
            ))}
          </div>
        </section>
        <p className="mt-8 text-xs leading-5 text-[var(--muted)]">Gym approval is separate from GymOS subscription activation. Subscription billing and payment verification will be added as a separate admin workflow.</p>
      </div>
    </main>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"><div className="flex items-center justify-between text-[var(--muted)]"><span className="text-xs">{label}</span>{icon}</div><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p></div>;
}

function Status({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "border-amber-900/70 bg-amber-950/30 text-amber-300",
    approved: "border-emerald-900/70 bg-emerald-950/30 text-emerald-300",
    rejected: "border-red-900/70 bg-red-950/30 text-red-300",
  };
  return <span className={`rounded-full border px-3 py-1 text-xs capitalize ${styles[status] || "border-[var(--border)] text-[var(--muted)]"}`}>{status}</span>;
}
