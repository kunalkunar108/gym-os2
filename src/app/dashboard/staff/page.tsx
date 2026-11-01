import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { inviteStaff, updateStaffStatus } from "./actions";

type Search = Promise<{ error?: string; success?: string; inviteToken?: string }>;

export default async function StaffPage({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownerRows } = await supabase.from("gym_users")
    .select("gym_id").eq("user_id", user.id).eq("role", "owner").eq("status", "active").limit(10);
  const ids = (ownerRows ?? []).map((row) => row.gym_id);
  if (!ids.length) redirect("/dashboard");

  const { data: gyms } = await supabase.from("gyms").select("id,name")
    .in("id", ids).eq("approval_status", "approved").order("created_at", { ascending: false }).limit(1);
  const gym = gyms?.[0];
  if (!gym) redirect("/onboarding");

  const { data: staff } = await supabase.from("gym_users")
    .select("user_id,role,status,created_at")
    .eq("gym_id", gym.id).eq("role", "staff").order("created_at", { ascending: false });

  const staffIds = (staff ?? []).map((row) => row.user_id);
  const { data: profiles } = staffIds.length
    ? await supabase.from("profiles").select("id,full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string | null }[] };

  const { data: invitations } = await supabase.from("gym_staff_invitations")
    .select("id,email,expires_at,accepted_at,revoked_at,created_at")
    .eq("gym_id", gym.id).order("created_at", { ascending: false }).limit(30);

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name || "Staff member"]));
  const inviteUrl = params.inviteToken
    ? `https://gym-os2.vercel.app/join-gym?token=${encodeURIComponent(params.inviteToken)}`
    : "";

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div><Link href="/dashboard" className="text-sm text-[var(--accent)]">← Dashboard</Link><h1 className="mt-3 text-3xl font-semibold">Staff management</h1><p className="mt-2 text-sm text-[var(--muted)]">{gym.name} · Owner controls</p></div>
      </div>

      {params.error && <p role="alert" className="mb-5 rounded-xl border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{params.error}</p>}
      {params.success && <p role="status" className="mb-5 rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-300">{params.success}</p>}

      {inviteUrl && <section className="mb-6 rounded-2xl border border-[var(--accent)] bg-[var(--surface)] p-5">
        <h2 className="font-semibold">Invitation link created</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Share this link only with the invited person. It expires in 7 days and can be used once. The invited person must sign in with the exact invited email address.</p>
        <div className="mt-3 break-all rounded-lg bg-[#0d1017] p-3 text-sm">{inviteUrl}</div>
        <p className="mt-2 text-xs text-[var(--muted)]">Copy and send this link privately. Do not post it publicly.</p>
      </section>}

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Invite a staff member</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Staff can manage members, memberships, payments and attendance. They cannot manage plans, gym settings, GymOS billing or staff access.</p>
          <form action={inviteStaff} className="mt-5 space-y-3">
            <label className="block text-sm">Staff email address
              <input name="email" type="email" required maxLength={254} placeholder="staff@example.com" className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[#0d1017] px-3 py-3 outline-none focus:border-[var(--accent)]"/>
            </label>
            <button className="w-full rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-black">Create invitation link</button>
          </form>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-semibold">Staff accounts</h2>
          <div className="mt-4 space-y-3">
            {(staff ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">No staff accounts have joined this gym yet.</p>}
            {(staff ?? []).map((member) => <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-3">
              <div><p className="font-medium">{names.get(member.user_id) ?? "Staff member"}</p><p className="mt-1 text-xs text-[var(--muted)]">{member.user_id}</p></div>
              <div className="flex items-center gap-3"><span className={member.status === "active" ? "text-xs text-emerald-400" : "text-xs text-amber-400"}>{member.status}</span>
                <form action={updateStaffStatus}><input type="hidden" name="user_id" value={member.user_id}/><input type="hidden" name="status" value={member.status === "active" ? "disabled" : "active"}/><button className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs">{member.status === "active" ? "Disable" : "Reactivate"}</button></form>
              </div>
            </div>)}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-lg font-semibold">Invitations</h2>
        <div className="mt-4 space-y-2">
          {(invitations ?? []).length === 0 && <p className="text-sm text-[var(--muted)]">No invitations created yet.</p>}
          {(invitations ?? []).map((invitation) => <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] py-3 last:border-0">
            <div><p className="text-sm font-medium">{invitation.email}</p><p className="text-xs text-[var(--muted)]">Expires {new Date(invitation.expires_at).toLocaleString("en-IN")}</p></div>
            <span className="text-xs text-[var(--muted)]">{invitation.accepted_at ? "Accepted" : invitation.revoked_at ? "Revoked" : new Date(invitation.expires_at) < new Date() ? "Expired" : "Pending"}</span>
          </div>)}
        </div>
      </section>
    </main>
  );
}
