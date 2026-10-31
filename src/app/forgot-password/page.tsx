"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email,setEmail]=useState("");
  const [error,setError]=useState("");
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setLoading(true);
    try {
      const supabase=createClient();
      const {error}=await supabase.auth.resetPasswordForEmail(email.trim(),{
        redirectTo:`${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if(error) throw error;
      setSent(true);
    } catch(err) {
      setError(err instanceof Error ? err.message : "Unable to send reset email.");
    } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Account recovery</p>
    <h1 className="mt-2 text-3xl font-semibold">Reset your password</h1>
    <p className="mt-2 text-sm text-[var(--muted)]">Enter your account email and we will send a password reset link.</p>
    {sent ? <p role="status" className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-4 text-sm text-emerald-300">If an account exists for this address, a reset link has been sent. Check your inbox.</p> :
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]" placeholder="you@example.com"/></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">{loading?"Sending...":"Send reset link"}</button>
    </form>}
    <Link href="/login" className="mt-6 block text-center text-sm text-[var(--accent)] hover:underline">Back to sign in</Link>
  </section></main>;
}
