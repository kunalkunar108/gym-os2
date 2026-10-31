import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, CalendarDays, ChevronDown,
  CircleHelp, ClipboardList, CreditCard, Dumbbell, LayoutDashboard, Plus,
  Search, Settings, ShieldCheck, Users, Wallet,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Members", icon: Users },
  { label: "Memberships", icon: ClipboardList },
  { label: "Attendance", icon: CalendarDays },
  { label: "Payments", icon: Wallet },
];

function MetricCard({ label, value, note, icon: Icon }: {
  label: string; value: string; note: string; icon: typeof Users;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span className="rounded-xl bg-[var(--surface-raised)] p-2 text-[var(--accent)]"><Icon size={18} /></span>
      </div>
      <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>
    </article>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[#0d1017] p-5 lg:flex lg:flex-col">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[var(--accent)] text-black"><Dumbbell size={21} /></div>
          <div><p className="text-lg font-bold tracking-tight">GymOS</p><p className="text-[10px] uppercase tracking-[.2em] text-[var(--muted)]">Gym operating system</p></div>
        </div>
        <div className="mt-9 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Workspace</div>
        <nav className="mt-3 space-y-1">
          {navItems.map(({ label, icon: Icon, active }) => (
            <div key={label} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${active ? "bg-[#202a1c] font-medium text-[var(--accent)]" : "text-slate-400"}`}>
              <Icon size={17} />{label}
            </div>
          ))}
        </nav>
        <div className="mt-8 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Manage</div>
        <div className="mt-3 space-y-1 text-sm text-slate-400">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3"><CreditCard size={17}/> Plans & pricing</div>
          <div className="flex items-center gap-3 rounded-xl px-3 py-3"><Settings size={17}/> Settings</div>
        </div>
        <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="flex items-center gap-2 text-xs font-medium"><ShieldCheck size={15} className="text-[var(--accent)]"/> Secure by design</div>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Each gym gets a private workspace. Your members and records stay yours.</p>
        </div>
      </aside>

      <section className="min-w-0 flex-1">
        <header className="flex h-[76px] items-center justify-between border-b border-[var(--border)] px-5 md:px-9">
          <div><p className="text-xs text-[var(--muted)]">Workspace / Overview</p><p className="mt-1 text-sm font-semibold">Gym dashboard</p></div>
          <div className="flex items-center gap-3">
            <button aria-label="Help" className="hidden rounded-xl border border-[var(--border)] p-2.5 text-slate-400 sm:block"><CircleHelp size={17}/></button>
            <button aria-label="Notifications" className="rounded-xl border border-[var(--border)] p-2.5 text-slate-400"><Bell size={17}/></button>
            <div className="ml-1 flex items-center gap-2 border-l border-[var(--border)] pl-4">
              <div className="grid size-9 place-items-center rounded-full bg-[#283344] text-xs font-semibold">GA</div>
              <div className="hidden sm:block"><p className="text-xs font-medium">Gym Admin</p><p className="text-[10px] text-[var(--muted)]">Owner account</p></div>
              <ChevronDown size={14} className="text-slate-500"/>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1440px] p-5 md:p-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div><p className="text-sm text-[var(--muted)]">Saturday, October 31, 2026</p><h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Good morning<span className="text-[var(--accent)]">.</span></h1><p className="mt-2 text-sm text-[var(--muted)]">Here&apos;s what&apos;s happening at your gym today.</p></div>
            <button className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[#10140b]"><Plus size={17}/> Add member</button>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total members" value="—" note="Connect your gym workspace to see data" icon={Users}/>
            <MetricCard label="Active memberships" value="—" note="Membership status will appear here" icon={Activity}/>
            <MetricCard label="Collected this month" value="—" note="Payments are not connected yet" icon={Wallet}/>
            <MetricCard label="Today’s check-ins" value="—" note="Attendance data will appear here" icon={CalendarDays}/>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
              <div className="flex items-center justify-between"><div><h2 className="font-semibold">Recent members</h2><p className="mt-1 text-xs text-[var(--muted)]">Your latest member registrations</p></div><button className="text-xs text-[var(--accent)]">View all</button></div>
              <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] px-5 text-center">
                <div className="grid size-11 place-items-center rounded-2xl bg-[var(--surface-raised)] text-slate-400"><Users size={20}/></div>
                <p className="mt-3 text-sm font-medium">No member records yet</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-[var(--muted)]">Once your gym workspace is connected, new registrations will show up here.</p>
              </div>
            </section>
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 md:p-6">
              <div><h2 className="font-semibold">Quick actions</h2><p className="mt-1 text-xs text-[var(--muted)]">Common tasks, one click away</p></div>
              <div className="mt-5 space-y-3">
                {[["Register a member","Add a new person to your gym",Users],["Record a payment","Log cash, UPI or bank transfer",Wallet],["Mark attendance","Check a member in",CalendarDays],["Create a membership plan","Set duration and pricing",ClipboardList]].map(([title, desc, Icon]) => {
                  const ActionIcon = Icon as typeof Users;
                  return <div key={title as string} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-3"><span className="rounded-lg bg-[var(--surface-raised)] p-2 text-[var(--accent)]"><ActionIcon size={17}/></span><div className="min-w-0 flex-1"><p className="text-xs font-medium">{title as string}</p><p className="mt-1 text-[11px] text-[var(--muted)]">{desc as string}</p></div><ArrowDownRight size={15} className="text-slate-500"/></div>;
                })}
              </div>
            </section>
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#39462b] bg-[#171e14] p-4 sm:flex-row sm:items-center">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#29371f] text-[var(--accent)]"><ShieldCheck size={19}/></div>
            <div className="flex-1"><p className="text-sm font-medium">Your GymOS workspace is being set up</p><p className="mt-1 text-xs leading-5 text-slate-400">This is the interface foundation. Authentication, database connection, tenant isolation and live gym data will be added before this dashboard is used with real customers.</p></div>
            <span className="w-fit rounded-full border border-[#52663c] px-3 py-1 text-[10px] font-medium text-[var(--accent)]">Setup stage</span>
          </div>
          <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[var(--muted)]"><span>© 2026 GymOS. Built for independent gyms.</span><span className="flex items-center gap-2"><Search size={12}/> Secure workspace architecture in progress</span></footer>
        </div>
      </section>
    </main>
  );
}
