"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinGymPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [message, setMessage] = useState("Checking your invitation...");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function claim() {
      if (!token) { setError("This invitation link is missing its token."); return; }
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setMessage("Sign in or create an account using the email address this invitation was sent to."); return; }
      const { error: claimError } = await supabase.rpc("claim_gym_staff_invitation", { invitation_token: token });
      if (!active) return;
      if (claimError) { setError(claimError.message); return; }
      setMessage("Invitation accepted. Opening your gym workspace...");
      router.replace("/dashboard");
      router.refresh();
    }
    claim();
    return () => { active = false; };
  }, [router, token]);

  const next = `/join-gym?token=${encodeURIComponent(token)}`;
  return <main className="grid min-h-screen place-items-center px-5 py-10"><section className="w-full max-w-lg rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">GymOS staff invitation</p>
    <h1 className="mt-2 text-2xl font-semibold">Join a gym workspace</h1>
    <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{message}</p>
    {error && <p role="alert" className="mt-4 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</p>}
    {!error && message.startsWith("Sign in") && <div className="mt-6 flex flex-wrap gap-3"><Link className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black" href={`/login?next=${encodeURIComponent(next)}`}>Sign in</Link><Link className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm" href={`/signup?next=${encodeURIComponent(next)}`}>Create account</Link></div>}
    <p className="mt-6 text-xs text-[var(--muted)]">Use the exact email address the gym owner invited. Invitation links expire after 7 days and can be accepted once.</p>
  </section></main>;
}
