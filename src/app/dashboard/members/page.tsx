import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Search, UserPlus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";
import { addMember, updateMember } from "./actions";

type SearchParams = Promise<{ q?: string; error?: string; success?: string }>;

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, gym } = await getActiveGymContext();

  let membersQuery = supabase
    .from("members")
    .select("id,member_code,full_name,phone,email,status,notes,created_at")
    .eq("gym_id", gym.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const search = params.q?.trim();
  if (search) {
    const safeSearch = search.replace(/[,%()]/g, " ").trim();
    if (safeSearch) {
      membersQuery = membersQuery.or(`full_name.ilike.%${safeSearch}%,phone.ilike.%${safeSearch}%,member_code.ilike.%${safeSearch}%`);
    }
  }

  const { data: members, error } = await membersQuery;
  const activeCount = (members ?? []).filter((member) => member.status === "active").length;

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-white"><ArrowLeft size={16}/> Dashboard</Link>
      </header>

      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">Members</h1><p className="mt-2 text-sm text-[var(--muted)]">Manage your gym's member directory.</p></div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Members shown</p><p className="mt-1 text-xl font-semibold">{members?.length ?? 0}</p></div>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"><p className="text-xs text-[var(--muted)]">Active shown</p><p className="mt-1 text-xl font-semibold">{activeCount}</p></div>
          </div>
        </div>

        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{params.error}</p>}
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">{params.success}</p>}

        <section className="mt-8 grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-5 flex items-center gap-2"><UserPlus size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Add a member</h2></div>
            <form action={addMember} className="space-y-4">
              <label className="block text-sm">Full name<input name="full_name" required minLength={2} maxLength={120} placeholder="Member's full name" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <label className="block text-sm">Phone number<input name="phone" required minLength={5} maxLength={30} type="tel" placeholder="10-digit mobile number" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <label className="block text-sm">Email <span className="text-[var(--muted)]">(optional)</span><input name="email" type="email" maxLength={254} placeholder="member@example.com" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <label className="block text-sm">Notes <span className="text-[var(--muted)]">(optional)</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Any useful notes" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3 text-sm outline-none focus:border-[var(--accent)]"/></label>
              <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black hover:opacity-90">Add member</button>
            </form>
          </div>

          <div className="min-w-0 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2"><Users size={18} className="text-[var(--accent)]"/><h2 className="font-semibold">Member directory</h2></div>
              <form className="flex gap-2" action="/dashboard/members" method="get">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3"><Search size={15} className="text-[var(--muted)]"/><input name="q" defaultValue={search} placeholder="Name, phone or ID" className="w-full bg-transparent py-2.5 text-sm outline-none sm:w-48"/></div>
                <button className="rounded-xl border border-[var(--border)] px-3 text-sm">Search</button>
              </form>
            </div>

            {error ? <p className="mt-6 text-sm text-red-300">Could not load members: {error.message}</p> : !members?.length ? <div className="py-14 text-center"><Users size={28} className="mx-auto text-[var(--muted)]"/><p className="mt-3 font-medium">No members found</p><p className="mt-1 text-sm text-[var(--muted)]">{search ? "Try a different search." : "Add your first member using the form."}</p></div> : (
              <div className="mt-5 space-y-3">
                {members.map((member) => (
                  <details key={member.id} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <summary className="flex cursor-pointer list-none flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div><p className="font-medium">{member.full_name}</p><p className="mt-1 text-xs text-[var(--muted)]">{member.member_code} · {member.phone}</p></div>
                      <span className={`w-fit rounded-full px-3 py-1 text-xs ${member.status === "active" ? "bg-emerald-500/10 text-emerald-300" : "bg-white/10 text-[var(--muted)]"}`}>{member.status}</span>
                    </summary>
                    <form action={updateMember} className="mt-4 grid gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-2">
                      <input type="hidden" name="member_id" value={member.id}/>
                      <label className="text-xs text-[var(--muted)]">Full name<input name="full_name" required minLength={2} maxLength={120} defaultValue={member.full_name} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Phone<input name="phone" required minLength={5} maxLength={30} defaultValue={member.phone} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Email<input name="email" type="email" maxLength={254} defaultValue={member.email ?? ""} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <label className="text-xs text-[var(--muted)]">Status<select name="status" defaultValue={member.status} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"><option value="active">Active</option><option value="inactive">Inactive</option><option value="archived">Archived</option></select></label>
                      <label className="text-xs text-[var(--muted)] sm:col-span-2">Notes<textarea name="notes" rows={2} maxLength={1000} defaultValue={member.notes ?? ""} className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)]"/></label>
                      <button className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black sm:col-span-2">Save changes</button>
                    </form>
                  </details>
                ))}
              </div>
            )}
            <p className="mt-5 text-xs text-[var(--muted)]">Showing up to 100 matching members. Member records are scoped to this gym by Supabase row-level security.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
