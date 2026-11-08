import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Settings2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveGymContext } from "@/lib/gym-context";
import { updateGymSettings } from "./actions";

type SearchParams = Promise<{ error?: string; success?: string }>;

export default async function GymSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { supabase, gym, gymId, role } = await getActiveGymContext();
  if (role !== "owner") redirect("/dashboard");
  const [{ data: settings, error }] = await Promise.all([
    supabase.from("gym_settings").select("currency,time_zone,expiry_warning_days").eq("gym_id", gymId).maybeSingle(),
  ]);

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">{gym.name}</p></div>
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-[var(--muted)]"><ArrowLeft size={16}/> Dashboard</Link>
      </header>
      <div className="mx-auto max-w-3xl p-6 md:p-10">
        <div className="flex items-center gap-3"><Settings2 className="text-[var(--accent)]"/><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Owner controls</p><h1 className="mt-1 text-3xl font-semibold">Gym settings</h1></div></div>
        <p className="mt-3 text-sm text-[var(--muted)]">Configure the defaults used across your gym workspace.</p>
        {params.success && <p role="status" className="mt-6 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">Settings saved successfully.</p>}
        {params.error && <p role="alert" className="mt-6 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{params.error === "invalid_settings" ? "Choose valid settings and try again." : "Settings could not be saved. Refresh and try again."}</p>}
        {error || !settings ? <p className="mt-6 rounded-xl border border-red-900 p-4 text-sm text-red-300">Could not load gym settings. {error?.message ?? "Settings record not found."}</p> : (
          <form action={updateGymSettings} className="mt-8 space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
            <label className="block text-sm font-medium">Currency
              <select name="currency" defaultValue={settings.currency} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <option value="INR">INR — Indian Rupee (₹)</option><option value="USD">USD — US Dollar ($)</option><option value="AED">AED — UAE Dirham</option>
              </select>
              <span className="mt-1 block text-xs text-[var(--muted)]">Used as the gym's display currency. Existing payment amounts are not converted.</span>
            </label>
            <label className="block text-sm font-medium">Time zone
              <select name="time_zone" defaultValue={settings.time_zone} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3">
                <option value="Asia/Kolkata">India — Asia/Kolkata</option><option value="Asia/Dubai">UAE — Asia/Dubai</option><option value="Asia/Singapore">Singapore — Asia/Singapore</option><option value="Europe/London">UK — Europe/London</option>
              </select>
            </label>
            <label className="block text-sm font-medium">Membership expiry warning
              <input name="expiry_warning_days" type="number" min="0" max="90" required defaultValue={settings.expiry_warning_days} className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-3"/>
              <span className="mt-1 block text-xs text-[var(--muted)]">Number of days before expiry to flag a membership. Set to 0 to disable the warning threshold.</span>
            </label>
            <button className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-black">Save settings</button>
          </form>
        )}
      </div>
    </main>
  );
}
