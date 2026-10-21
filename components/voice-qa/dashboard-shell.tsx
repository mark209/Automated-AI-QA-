"use client";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  Activity,
  BookOpenCheck,
  FileAudio,
  LayoutDashboard,
  Menu,
  Mic2,
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
            <span className="font-display text-sm font-semibold tracking-[-0.02em]">QA AI Automation</span>
          </div>
          <button aria-label="Close navigation" className="focus-ring rounded p-1 text-slate-400 lg:hidden" onClick={() => setSidebarOpen(false)}><X size={18} /></button>
        </div>
        <SidebarGroup title="MAIN" items={navItems.filter((item) => item.href)} onNavigate={() => setSidebarOpen(false)} />
        <SidebarGroup title="SETTINGS" items={settingsItems} className="mt-8" onNavigate={() => setSidebarOpen(false)} />
        <AuthUserMenu />
      </aside>
      <main className="min-h-screen min-w-0 lg:pl-[248px]">
        <div className="w-full min-w-0 px-5 pb-10 pt-7 sm:px-8 lg:px-10">
          <header className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div className="pl-12 lg:pl-0"><h1 className="font-display text-[30px] font-semibold tracking-[-0.04em]">Dashboard</h1><p className="mt-1 text-sm text-muted">Call quality activity processed by ARC AI Engine.</p></div>
          </header>
          <DashboardOverview />
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({ title, items, className = "", onNavigate }: { title: string; items: Array<{ label: string; icon: typeof LayoutDashboard; href?: string }>; className?: string; onNavigate: () => void }) {
  return <div className={className}><p className="mb-2 px-2 text-[11px] font-semibold tracking-[0.12em] text-slate-500">{title}</p><nav aria-label={title} className="space-y-1">{items.map(({ label, icon: Icon, href }, index) => { const content = <><Icon size={18} strokeWidth={1.8} /><span>{label}</span></>; return href ? <Link key={label} href={href as Route} className={`focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${index === 0 && title === "MAIN" ? "border border-[var(--line)] bg-[rgba(214,83,104,0.16)] text-white shadow-[0_0_24px_rgba(214,83,104,0.12)]" : "text-slate-300 hover:bg-white/10 hover:text-white"}`} onClick={onNavigate}>{content}</Link> : <button key={label} className="focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white">{content}</button>; })}</nav></div>;
}
