"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  FileAudio,
  FileChartColumn,
  Filter,
  LayoutDashboard,
  Menu,
  Mic2,
  Search,
  Settings2,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { AuthUserMenu } from "@/components/voice-qa/auth-user-menu";
import { DashboardOverview } from "@/components/voice-qa/dashboard-overview";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Analyze Call", icon: Mic2, href: "/voice-qa/analyze" },
  { label: "Call History", icon: FileAudio, href: "/voice-qa/calls" },
  { label: "QA Templates", icon: BookOpenCheck, href: "/voice-qa/templates" },
  { label: "Agents", icon: Users },
  { label: "Reports", icon: FileChartColumn },
];

const settingsItems = [
  { label: "Organization", icon: ShieldCheck, href: "/settings/organization" },
  { label: "Users & Roles", icon: Users, href: "/settings/users" },
  { label: "AI Configuration", icon: Settings2, href: "/settings/ai-configuration" },
];

export function DashboardShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      <button aria-label="Open navigation" className="focus-ring fixed left-4 top-4 z-30 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-2 text-white shadow-lg lg:hidden" onClick={() => setSidebarOpen(true)}>
        <Menu size={20} />
      </button>
      {sidebarOpen && <button aria-label="Close navigation overlay" className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-[248px] flex-col border-r border-[var(--line)] bg-[var(--navy)] px-4 py-5 text-white transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-9 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)] text-white shadow-[0_0_22px_rgba(214,83,104,0.28)]" aria-hidden="true"><Activity size={20} strokeWidth={2.5} /></div>
            <span className="font-display text-[19px] font-semibold tracking-[-0.04em]">AI Test Operations</span>
          </div>
          <button aria-label="Close navigation" className="focus-ring rounded p-1 text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <SidebarGroup title="MAIN" items={navItems} />
        <SidebarGroup title="SETTINGS" items={settingsItems} className="mt-8" />
        <AuthUserMenu />
      </aside>
      <main className="min-h-screen min-w-0 lg:pl-[248px]">
        <div className="w-full min-w-0 px-5 pb-10 pt-7 sm:px-8 lg:px-10">
          <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="pl-12 lg:pl-0"><h1 className="font-display text-[30px] font-semibold tracking-[-0.04em]">Dashboard</h1><p className="mt-1 text-sm text-muted">Overview of voice quality performance and recent evaluations.</p></div>
            <div className="dashboard-toolbar flex flex-wrap items-center justify-end gap-3 self-end lg:self-start"><button aria-label="Help" className="focus-ring hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 md:block"><CircleHelp size={20} /></button><button aria-label="Notifications" className="focus-ring hidden rounded-lg p-2 text-slate-400 hover:bg-white/10 md:block"><Bell size={20} /></button><button className="focus-ring surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700"><span>May 19 – May 25, 2025</span><ChevronDown size={16} /></button><button className="focus-ring surface flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700"><Filter size={16} /><span className="hidden sm:inline">Filters</span></button></div>
          </header>
          <DashboardOverview />
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({ title, items, className = "" }: { title: string; items: Array<{ label: string; icon: typeof LayoutDashboard; href?: string }>; className?: string }) {
  return <div className={className}><p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.12em] text-slate-500">{title}</p><nav aria-label={title} className="space-y-1">{items.map(({ label, icon: Icon, href }, index) => { const content = <><Icon size={18} strokeWidth={1.8} /><span>{label}</span></>; return href ? <Link key={label} href={href as Route} className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${index === 0 && title === "MAIN" ? "border border-[var(--line)] bg-[rgba(214,83,104,0.16)] text-white shadow-[0_0_24px_rgba(214,83,104,0.12)]" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} onClick={() => window.innerWidth < 1024 && window.dispatchEvent(new Event("resize"))}>{content}</Link> : <button key={label} className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">{content}</button>; })}</nav></div>;
}

function DashboardContent() {
  return <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{["Total Calls Analyzed", "Average Score", "Pass Rate", "Needs Review", "Failed Calls"].map((label) => <KpiCard key={label} label={label} />)}</section><section className="grid gap-5 xl:grid-cols-[1.1fr_1.35fr_1fr]"><EmptyChart title="Score Distribution" icon={<BarChart3 size={16} />} /><EmptyChart title="Average Score Trend" icon={<Activity size={16} />} /><EmptyChart title="Top Failing Criteria" icon={<ShieldCheck size={16} />} /></section><section className="grid gap-5 xl:grid-cols-[0.85fr_2fr]"><EmptyActivity /><EmptyEvaluations /></section></div>;
}

function KpiCard({ label }: { label: string }) {
  return <article className="surface rounded-xl p-4"><div className="flex items-center justify-between"><div className="h-10 w-10 rounded-xl bg-slate-100" /><span className="text-xs text-muted">—</span></div><p className="mt-4 text-sm font-medium text-slate-600">{label}</p><p className="mt-1 font-display text-[26px] font-semibold tracking-[-0.04em] text-slate-300">—</p><p className="mt-2 text-xs text-muted">Connect Supabase to load metrics</p></article>;
}

function EmptyChart({ title, icon }: { title: string; icon: React.ReactNode }) {
  return <article className="surface min-h-[250px] rounded-xl p-5"><div className="flex items-center gap-2 font-display text-sm font-semibold">{title}<span className="text-slate-400">{icon}</span></div><div className="flex h-[190px] items-center justify-center text-center text-sm text-muted"><div><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">{icon}</div><p>Analytics will appear after evaluations are processed.</p></div></div></article>;
}

function EmptyActivity() { return <article className="surface min-h-[350px] rounded-xl p-5"><h2 className="font-display text-sm font-semibold">Recent Activity</h2><div className="flex h-[280px] items-center justify-center text-center text-sm text-muted"><div><Activity className="mx-auto mb-3 text-slate-300" /><p>No activity yet.</p><p className="mt-1 text-xs">Upload a call to begin building your QA history.</p></div></div></article>; }

function EmptyEvaluations() { return <article className="surface min-h-[350px] rounded-xl p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><h2 className="font-display text-sm font-semibold">Recent Evaluations</h2><label className="focus-within:ring-2 focus-within:ring-blue-200 flex items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs text-muted"><Search size={15} /><input aria-label="Search evaluations" placeholder="Search calls, agents, or IDs" className="w-full bg-transparent outline-none placeholder:text-slate-400 sm:w-48" /></label></div><div className="flex h-[265px] items-center justify-center text-center text-sm text-muted"><div><FileChartColumn className="mx-auto mb-3 text-slate-300" /><p>No evaluations found.</p><p className="mt-1 text-xs">Processed calls will appear here.</p></div></div></article>; }
