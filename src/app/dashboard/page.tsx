import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Dumbbell, LogOut, ShieldCheck } from "lucide-react";

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
  if (gym.approval_status !== "approved") redirect("/onboarding");

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={20}/></span><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Gym operating system</p></div></div>
        <form action="/auth/signout" method="post"><button className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]"><LogOut size={14}/> Sign out</button></form>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Approved workspace</p>
        <h1 className="mt-2 text-3xl font-semibold">{gym.name}</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Your gym workspace is approved. The next build phase will connect member, membership, payment and attendance modules to live data.</p>
        <section className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <div className="flex items-center gap-3"><ShieldCheck className="text-[var(--accent)]"/><div><h2 className="font-semibold">Workspace access verified</h2><p className="mt-1 text-xs text-[var(--muted)]">This account has an approved gym workspace.</p></div></div>
          <p className="mt-5 text-sm text-[var(--muted)]">Member management and financial features are not enabled yet. We will add them after authentication and tenant-access tests.</p>
        </section>
      </div>
    </main>
  );
}
