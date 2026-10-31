"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (signInError) throw signInError;
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-2xl shadow-black/20 sm:p-9">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={22}/></span>
          <div><p className="text-xl font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Gym operating system</p></div>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Welcome back</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to GymOS</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Manage your gym from one secure workspace.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium">Email address
            <input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="you@example.com"/>
          </label>
          <label className="block text-sm font-medium">Password
            <input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="Enter your password"/>
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[#10140b] disabled:opacity-60">
            {loading && <LoaderCircle size={17} className="animate-spin"/>}{loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-5 flex justify-between text-sm">
          <Link href="/forgot-password" className="text-[var(--accent)] hover:underline">Forgot password?</Link>
          <Link href="/signup" className="text-[var(--muted)] hover:text-white">Create account</Link>
        </div>
      </section>
    </main>
  );
}
