import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { registerAdditionalGym } from "./actions";

type SearchParams = Promise<{ submitted?: string; error?: string }>;

export default async function NewGymPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  if (params.submitted === "1") return <main className="mx-auto max-w-xl p-8"><h1 className="text-2xl font-semibold">Gym submitted for approval</h1><p className="mt-3 text-sm text-[var(--muted)]">The new gym has been registered. It will appear in your workspace switcher after the GymOS team approves it.</p><Link className="mt-6 inline-block text-sm text-[var(--accent)]" href="/dashboard">Return to dashboard →</Link></main>;
  return <main className="mx-auto max-w-xl px-5 py-12"><Link href="/dashboard" className="text-sm text-[var(--muted)]">← Dashboard</Link><section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7"><div className="flex items-center gap-3"><Building2 className="text-[var(--accent)]"/><div><p className="text-xs uppercase tracking-widest text-[var(--accent)]">Multi-gym account</p><h1 className="text-2xl font-semibold">Register another gym</h1></div></div><p className="mt-3 text-sm text-[var(--muted)]">Each gym gets a separate workspace and must be approved independently.</p>{params.error && <p className="mt-5 rounded-xl border border-red-900 p-3 text-sm text-red-300">{params.error}</p>}<form action={registerAdditionalGym} className="mt-6 space-y-4"><label className="block text-sm">Gym name<input name="name" required minLength={2} maxLength={120} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3" placeholder="e.g. Iron House Fitness"/></label><label className="block text-sm">Workspace slug<input name="slug" required minLength={2} maxLength={55} pattern="[a-z0-9]+(-[a-z0-9]+)*" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-4 py-3" placeholder="iron-house-fitness"/><span className="mt-1 block text-xs text-[var(--muted)]">Lowercase letters, numbers and hyphens only.</span></label><button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-black">Submit gym for approval</button></form></section></main>;
}
