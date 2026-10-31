"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error: signupError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
      });
      if (signupError) throw signupError;
      if (data.session) {
        router.replace("/onboarding");
        router.refresh();
      } else {
        setMessage("Account created. Check your email to confirm your address, then sign in to register your gym.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create your account. Please try again.");
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
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Get started</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">First create your login. You can submit your gym for approval next.</p>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium">Your full name
            <input required minLength={2} maxLength={100} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="Full name"/>
          </label>
          <label className="block text-sm font-medium">Email address
            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="you@example.com"/>
          </label>
          <label className="block text-sm font-medium">Password
            <input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="At least 8 characters"/>
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-900 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
          {message && <p role="status" className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">{message}</p>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[#10140b] disabled:opacity-60">
            {loading && <LoaderCircle size={17} className="animate-spin"/>}{loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-[var(--muted)]">Already registered? <Link href="/login" className="text-[var(--accent)] hover:underline">Sign in</Link></p>
      </section>
    </main>
  );
}
