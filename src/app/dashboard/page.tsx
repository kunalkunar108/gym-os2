import Link from "next/link";
import { redirect } from "next/navigation";
import { Dumbbell, LogOut, ShieldCheck, Users, Layers3, CalendarDays, Wallet, UserCheck, Settings2, CreditCard, Activity, Building2, ArrowLeftRight } from "lucide-react";
import { getActiveGymContext } from "@/lib/gym-context";
import { switchActiveGym } from "./actions";

export default async function DashboardPage() {
  const { gym, gyms, role } = await getActiveGymContext();
  const isOwner = role === "owner";

  const cards = [
    { href: "/dashboard/members", title: "Member management", description: "Add members, search the directory and update member details or status.", label: "Open members", icon: Users, show: true },
    { href: "/dashboard/plans", title: "Membership plans", description: "Create and manage monthly, quarterly, half-yearly and annual plans.", label: "Manage plans", icon: Layers3, show: isOwner },
    { href: "/dashboard/memberships", title: "Member memberships", description: "Assign plans to members, calculate expiry dates and view membership history.", label: "Manage memberships", icon: CalendarDays, show: true },
    { href: "/dashboard/payments", title: "Payments & receipts", description: "Record member payments, track outstanding balances and print receipts.", label: "Manage payments", icon: Wallet, show: true },
    { href: "/dashboard/attendance", title: "Attendance management", description: "Check members in and out, see who is currently inside and review attendance history.", label: "Manage attendance", icon: UserCheck, show: true },
    { href: "/dashboard/staff", title: "Staff management", description: "Invite staff, review access and disable or reactivate staff accounts.", label: "Manage staff", icon: Users, show: isOwner },
    { href: "/dashboard/billing", title: "GymOS subscription", description: "View platform plans, submit subscription payments and track verification.", label: "View billing", icon: CreditCard, show: isOwner },
    { href: "/dashboard/settings", title: "Gym settings", description: "Configure currency, time zone and membership expiry warning defaults.", label: "Manage settings", icon: Settings2, show: isOwner },
    { href: "/dashboard/activity", title: "Activity log", description: "Review recent recorded actions in this gym workspace.", label: "View activity", icon: Activity, show: true },
  ];

  return (
    <main className="min-h-screen">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5 md:px-10">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={20}/></span><div><p className="font-bold">GymOS</p><p className="text-xs text-[var(--muted)]">Gym operating system</p></div></div>
        <form action="/auth/signout" method="post"><button className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)]"><LogOut size={14}/> Sign out</button></form>
      </header>
      <div className="mx-auto max-w-6xl p-6 md:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--accent)]">Gym workspace</p><h1 className="mt-2 text-3xl font-semibold">{gym.name}</h1><p className="mt-2 text-sm text-[var(--muted)]">{isOwner ? "Owner workspace. Manage your gym operations from one place." : "Staff workspace. Your access is limited to the permissions assigned by the gym owner."}</p></div>
          {gyms.length > 1 && <form action={switchActiveGym} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:min-w-72"><label htmlFor="gym_id" className="flex items-center gap-2 text-xs font-semibold text-[var(--muted)]"><ArrowLeftRight size={14}/> SWITCH GYM WORKSPACE</label><div className="flex gap-2"><select id="gym_id" name="gym_id" defaultValue={gym.id} className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[#0d1017] px-3 py-2 text-sm">{gyms.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-black">Switch</button></div></form>}
        </div>
        {gyms.length > 1 && <p className="mt-4 text-xs text-[var(--muted)]"><Building2 size={13} className="mr-1 inline"/> You have access to {gyms.length} approved gym workspaces. Each workspace keeps its operational data separate.</p>}
        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.filter((card)=>card.show).map(({href,title,description,label,icon:Icon})=><Link key={href} href={href} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 transition hover:border-[var(--accent)]"><div className="flex items-center gap-3"><Icon className="text-[var(--accent)]"/><h2 className="font-semibold">{title}</h2></div><p className="mt-3 text-sm text-[var(--muted)]">{description}</p><p className="mt-5 text-sm font-semibold text-[var(--accent)]">{label} →</p></Link>)}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6"><div className="flex items-center gap-3"><ShieldCheck className="text-[var(--accent)]"/><h2 className="font-semibold">Workspace access verified</h2></div><p className="mt-3 text-sm text-[var(--muted)]">Gym access is verified against your active membership. Database row-level security remains the tenant data boundary.</p></section>
        </section>
      </div>
    </main>
  );
}
