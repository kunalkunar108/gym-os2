import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";

export default async function ActivityPage() {
  const { supabase, gym, gymId } = await getActiveGymContext();
  const { data: logs, error } = await supabase.from("audit_logs")
    .select("id,actor_id,action,entity_type,entity_id,metadata,created_at")
    .eq("gym_id", gymId).order("created_at", { ascending: false }).limit(100);

  const actorIds = [...new Set((logs ?? []).map(log => log.actor_id).filter(Boolean))] as string[];
  const { data: actors } = actorIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", actorIds)
    : { data: [] as {id:string;full_name:string|null}[] };
  const actorNames = new Map((actors ?? []).map(actor => [actor.id, actor.full_name || "Gym user"]));

  return <main className="min-h-screen">
    <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
      <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym?.name ?? "Gym workspace"}</p></div>
      <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
    </header>
    <div className="mx-auto max-w-5xl p-6 md:p-10">
      <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Workspace history</p>
      <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold"><Activity className="text-[var(--accent)]"/> Activity log</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Recent recorded actions for this gym. Only activity belonging to your workspace is shown.</p>
      {error && <p role="alert" className="mt-6 rounded-xl border border-red-900 p-4 text-sm text-red-300">Could not load activity: {error.message}</p>}
      <section className="mt-7 space-y-3">
        {(logs ?? []).map(log => <article key={log.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><p className="font-medium">{log.action.replaceAll(".", " ").replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[var(--muted)]">{actorNames.get(log.actor_id ?? "") ?? "System"} · {log.entity_type.replaceAll("_", " ")}</p></div>
            <time className="text-xs text-[var(--muted)]">{new Date(log.created_at).toLocaleString("en-IN", {dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Kolkata"})}</time>
          </div>
          {log.entity_id && <p className="mt-3 break-all text-[11px] text-[var(--muted)]">Record: {log.entity_id}</p>}
          {log.metadata && Object.keys(log.metadata).length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs text-[var(--accent)]">Event details</summary><pre className="mt-2 overflow-x-auto rounded-lg bg-[#0d1017] p-3 text-xs text-[var(--muted)]">{JSON.stringify(log.metadata, null, 2)}</pre></details>}
        </article>)}
        {!error && (logs ?? []).length === 0 && <div className="rounded-2xl border border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">No activity has been recorded yet.</div>}
      </section>
      <p className="mt-5 text-xs text-[var(--muted)]">Showing the latest 100 recorded events. This log is read-only.</p>
    </div>
  </main>;
}
