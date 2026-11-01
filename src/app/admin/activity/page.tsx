import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminActivityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("platform_role").eq("id", user.id).maybeSingle();
  if (profile?.platform_role !== "super_admin") redirect("/dashboard");

  const { data: logs, error } = await supabase.from("audit_logs")
    .select("id,gym_id,actor_id,action,entity_type,entity_id,metadata,created_at")
    .order("created_at", { ascending: false }).limit(150);
  const gymIds = [...new Set((logs ?? []).map(log => log.gym_id).filter(Boolean))] as string[];
  const actorIds = [...new Set((logs ?? []).map(log => log.actor_id).filter(Boolean))] as string[];
  const [{ data: gyms }, { data: actors }] = await Promise.all([
    gymIds.length ? supabase.from("gyms").select("id,name").in("id", gymIds) : Promise.resolve({data:[]}),
    actorIds.length ? supabase.from("profiles").select("id,full_name").in("id", actorIds) : Promise.resolve({data:[]}),
  ]);
  const gymNames = new Map((gyms ?? []).map(gym => [gym.id,gym.name]));
  const actorNames = new Map((actors ?? []).map(actor => [actor.id,actor.full_name || "User"]));

  return <main className="min-h-screen">
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10"><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Platform administration</p></div><Link href="/admin" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Admin dashboard</Link></header>
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Platform oversight</p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold"><Activity className="text-[var(--accent)]"/> Platform activity</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Latest recorded events across GymOS workspaces.</p>
      {error && <p role="alert" className="mt-6 text-sm text-red-300">Could not load activity: {error.message}</p>}
      <section className="mt-7 space-y-3">
        {(logs ?? []).map(log => <article key={log.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-medium">{log.action.replaceAll(".", " ").replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">{gymNames.get(log.gym_id ?? "") ?? "Platform-level event"} · {actorNames.get(log.actor_id ?? "") ?? "System"} · {log.entity_type.replaceAll("_", " ")}</p></div><time className="text-xs text-[var(--muted)]">{new Date(log.created_at).toLocaleString("en-IN", {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})}</time></div>
          {log.entity_id && <p className="mt-3 break-all text-[11px] text-[var(--muted)]">Record: {log.entity_id}</p>}
          {log.metadata && Object.keys(log.metadata).length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs text-[var(--accent)]">Event details</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-[#0d1017] p-3 text-xs text-[var(--muted)]">{JSON.stringify(log.metadata,null,2)}</pre></details>}
        </article>)}
        {!error && (logs ?? []).length===0 && <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">No platform activity recorded yet.</div>}
      </section>
      <p className="mt-5 text-xs text-[var(--muted)]">Showing the latest 150 events. This log is read-only.</p>
    </div>
  </main>;
}
