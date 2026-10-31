"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [confirm,setConfirm]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    if(password!==confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const supabase=createClient();
      const {error}=await supabase.auth.updateUser({password});
      if(error) throw error;
      router.replace("/dashboard");
      router.refresh();
    } catch(err) {
      setError(err instanceof Error ? err.message : "Unable to update password. Request a new reset link.");
    } finally { setLoading(false); }
  }

  return <main className="flex min-h-screen items-center justify-center px-5 py-12"><section className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Account recovery</p>
    <h1 className="mt-2 text-3xl font-semibold">Choose a new password</h1>
    <form onSubmit={submit} className="mt-7 space-y-4">
      <label className="block text-sm font-medium">New password<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]"/></label>
      <label className="block text-sm font-medium">Confirm new password<input required minLength={8} type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3 outline-none focus:border-[var(--accent)]"/></label>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black disabled:opacity-60">{loading?"Updating...":"Update password"}</button>
    </form>
  </section></main>;
}
