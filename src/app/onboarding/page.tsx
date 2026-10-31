"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, LoaderCircle, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function toSlug(value: string) {
  return value.toLowerCase().trim().normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 55);
}

export default function OnboardingPage() {
  const router = useRouter();
  const [gymName, setGymName] = useState("");
  const [slug, setSlug] = useState("");
  const [userId, setUserId] = useState("");
  const [existing, setExisting] = useState<{name:string;approval_status:string;rejection_reason:string|null}|null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      const { data, error: queryError } = await supabase.from("gyms").select("name,approval_status,rejection_reason").eq("owner_user_id", user.id).maybeSingle();
      if (!active) return;
      setUserId(user.id);
      if (queryError) setError(queryError.message);
      if (data) setExisting(data);
      setChecking(false);
    }
    load();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const cleanName = gymName.trim();
      const cleanSlug = toSlug(slug || cleanName);
      if (cleanSlug.length < 2) throw new Error("Please enter a longer gym name or workspace address.");
      const { error: insertError } = await supabase.from("gyms").insert({
        name: cleanName,
        slug: cleanSlug,
        owner_user_id: userId,
        approval_status: "pending",
      });
      if (insertError) throw insertError;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your gym. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (checking) return <main className="grid min-h-screen place-items-center text-sm text-[var(--muted)]">Loading your account...</main>;

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 sm:p-9">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={22}/></span><div><p className="text-xl font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Gym onboarding</p></div></div>
          <button onClick={signOut} className="flex items-center gap-2 text-xs text-[var(--muted)] hover:text-white"><LogOut size={15}/> Sign out</button>
        </div>
        {existing ? (
          <div className="mt-9">
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Registration status</p>
            <h1 className="mt-2 text-2xl font-semibold">{existing.name}</h1>
            <p className="mt-4 rounded-xl border border-[var(--border)] bg-[#0d1017] p-4 text-sm leading-6 text-[var(--muted)]">
              {existing.approval_status === "approved" ? "Your gym is approved. Open your workspace." : existing.approval_status === "rejected" ? `Your request was not approved. ${existing.rejection_reason ?? "Contact GymOS support for details."}` : "Your gym registration is waiting for review by the GymOS platform team. Workspace access will be enabled after approval."}
            </p>
            {existing.approval_status === "approved" && <button onClick={()=>router.replace("/dashboard")} className="mt-5 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black">Open dashboard</button>}
            {existing.approval_status === "rejected" && <p className="mt-4 text-xs text-[var(--muted)]">Please contact support before submitting another request.</p>}
          </div>
        ) : (
          <>
            <p className="mt-9 text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Step 2 of 2</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Register your gym</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Submit your gym details. The GymOS team must approve your request before you can access the management workspace.</p>
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block text-sm font-medium">Gym or fitness centre name
                <input required minLength={2} maxLength={120} value={gymName} onChange={e=>{setGymName(e.target.value);setSlug(toSlug(e.target.value));}} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="e.g. Iron House Fitness"/>
              </label>
              <label className="block text-sm font-medium">Workspace address
                <div className="mt-2 flex overflow-hidden rounded-xl border border-[var(--border)] bg-[#0d1017] focus-within:border-[var(--accent)]"><span className="px-3 py-3 text-xs text-[var(--muted)]">gymos.app/</span><input required minLength={2} maxLength={55} value={slug} onChange={e=>setSlug(toSlug(e.target.value))} className="min-w-0 flex-1 bg-transparent px-2 py-3 text-sm outline-none" placeholder="iron-house-fitness"/></div>
                <span className="mt-2 block text-xs text-[var(--muted)]">Use lowercase letters, numbers and hyphens. This address must be unique.</span>
              </label>
              {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
              <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[#10140b] disabled:opacity-60">{loading && <LoaderCircle size={17} className="animate-spin"/>}{loading ? "Submitting..." : "Submit for approval"}</button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
