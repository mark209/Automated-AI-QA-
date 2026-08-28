"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, FileChartColumn, RefreshCw } from "lucide-react";
import { summarizeCalls } from "@/lib/voice-qa/dashboard-metrics";

type Call = { id: string; status: string; verdict: string | null; overall_score: number | null; original_filename: string; created_at: string; agents?: { name: string } | { name: string }[] | null };

export function DashboardOverview() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/voice-qa/dashboard", { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result?.error ?? "Unable to load dashboard data."); setCalls(result.calls ?? []); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load dashboard data.")).finally(() => setLoading(false)); }, []);
  const summary = summarizeCalls(calls);
  if (loading) return <div className="surface flex min-h-64 items-center justify-center rounded-xl text-sm text-muted"><RefreshCw className="mr-2 animate-spin" size={17} /> Loading dashboard…</div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  const cards = [["Total calls", summary.totalCalls], ["Average score", summary.averageScore === null ? "—" : `${summary.averageScore}%`], ["Qualified", summary.qualified], ["Needs review", summary.needsReview], ["Not qualified / failed", summary.failed]];
  return <div className="space-y-5"><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{cards.map(([label, value]) => <article key={String(label)} className="surface rounded-xl p-4"><div className="flex items-center justify-between"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-blue-600"><Activity size={18} /></div><span className="text-xs text-muted">Live</span></div><p className="mt-4 text-sm font-medium text-slate-600">{label}</p><p className="mt-1 font-display text-[26px] font-semibold tracking-[-0.04em]">{value}</p></article>)}</section><section className="surface rounded-xl p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-lg font-semibold">Recent calls</h2><p className="mt-1 text-sm text-muted">The latest 100 calls from your organization.</p></div><Link href="/voice-qa/calls" className="text-sm font-semibold text-blue-700">View call history →</Link></div>{calls.length === 0 ? <div className="flex min-h-48 items-center justify-center text-center text-sm text-muted"><div><FileChartColumn className="mx-auto mb-3 text-slate-300" /><p>No calls yet.</p><p className="mt-1 text-xs">Upload a call to begin building your QA history.</p></div></div> : <div className="mt-4 divide-y divide-[var(--line)]">{calls.slice(0, 8).map((call) => <Link key={call.id} href={`/voice-qa/calls/${call.id}`} className="flex flex-col gap-2 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-slate-800">{call.original_filename}</p><p className="mt-1 text-xs text-muted">{Array.isArray(call.agents) ? call.agents[0]?.name : call.agents?.name ?? "Unassigned"} · {new Date(call.created_at).toLocaleDateString()}</p></div><span className="flex items-center gap-1 text-xs font-semibold text-slate-600">{call.verdict === "QUALIFIED" ? <CheckCircle2 size={14} className="text-emerald-600" /> : call.verdict === "NEEDS_REVIEW" ? <AlertCircle size={14} className="text-amber-600" /> : null}{call.verdict ?? call.status.replaceAll("_", " ")}</span></Link>)}</div>}</section></div>;
}
