"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, FileChartColumn, Gauge, PhoneCall, RefreshCw, UserRound, XCircle } from "lucide-react";
import { summarizeCalls } from "@/lib/voice-qa/dashboard-metrics";
import { formatCallOutcome } from "@/lib/voice-qa/call-display";
import { getPageInfo } from "@/lib/voice-qa/call-list";
import { DeleteRecordingButton } from "@/components/voice-qa/delete-recording-button";

type Call = { id: string; status: string; verdict: string | null; overall_score: number | null; original_filename: string; created_at: string; agents?: { name: string } | { name: string }[] | null };
const tableColumns = "md:grid-cols-[minmax(260px,2.4fr)_minmax(120px,1fr)_minmax(140px,1.1fr)_minmax(135px,1fr)_minmax(64px,.5fr)_minmax(170px,auto)]";

export function DashboardOverview() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/voice-qa/dashboard", { cache: "no-store" }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result?.error ?? "Unable to load dashboard data."); setCalls(result.calls ?? []); }).catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to load dashboard data.")).finally(() => setLoading(false)); }, []);
  const summary = summarizeCalls(calls);
  const pageInfo = getPageInfo(calls.length, page);
  const visibleCalls = calls.slice(pageInfo.from, pageInfo.to);
  if (loading) return <div className="surface flex min-h-64 items-center justify-center rounded-xl text-sm text-muted"><RefreshCw className="mr-2 animate-spin" size={17} /> Loading dashboard…</div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>;
  const cards = [["Total calls", summary.totalCalls, PhoneCall], ["Average score", summary.averageScore === null ? "—" : `${summary.averageScore}%`, Gauge], ["Qualified", summary.qualified, CheckCircle2], ["Needs review", summary.needsReview, AlertCircle], ["Not qualified / failed", summary.failed, XCircle]] as const;
  return <div className="space-y-5">
    <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">{cards.map(([label, value, Icon]) => <article key={String(label)} className="surface metric-card rounded-xl p-5"><div className="relative z-10 flex items-center justify-between"><div className="metric-icon flex h-10 w-10 items-center justify-center rounded-xl"><Icon size={18} /></div><span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Live <span className="text-[var(--accent)]">●</span></span></div><p className="relative z-10 mt-5 text-sm font-medium text-slate-600">{label}</p><p className="relative z-10 mt-1 font-display text-[30px] font-semibold tracking-[-0.05em]">{value}</p></article>)}</section>
    <section className="surface rounded-xl p-5 sm:p-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><h2 className="font-display text-lg font-semibold">Recent calls</h2><span className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-xs text-muted">Showing {pageInfo.from + 1}–{pageInfo.to} of {calls.length} calls</span></div><p className="mt-2 text-sm text-muted">Latest recordings from your organization.</p></div><Link href="/voice-qa/calls" className="text-sm font-semibold text-blue-700">View call history →</Link></div>
      {calls.length === 0 ? <div className="empty-state flex min-h-48 items-center justify-center text-center text-sm"><div><FileChartColumn className="mx-auto mb-3 text-slate-300" /><p>No calls yet.</p><p className="mt-1 text-xs">Upload a call to begin building your QA history.</p></div></div> : <><div className="mt-5 overflow-x-auto"><div className="min-w-[940px]"><div className={`hidden ${tableColumns} gap-4 border-b border-[var(--line)] px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted md:grid`}><span>Call</span><span>Date</span><span>Assignee</span><span>Status</span><span>Score</span><span className="text-right">Action</span></div><div className="divide-y divide-[var(--line)]">{visibleCalls.map((call) => <RecordingRow key={call.id} call={call} onDeleted={() => { setCalls((current) => current.filter((item) => item.id !== call.id)); setPage(1); }} />)}</div></div></div><Pagination pageInfo={pageInfo} onPrevious={() => setPage((current) => current - 1)} onNext={() => setPage((current) => current + 1)} /></>}
    </section>
  </div>;
}

function RecordingRow({ call, onDeleted }: { call: Call; onDeleted: () => void }) {
  const assignee = Array.isArray(call.agents) ? call.agents[0]?.name ?? "Unassigned" : call.agents?.name ?? "Unassigned";
  const status = call.verdict ?? call.status;
  return <div className={`table-row grid gap-4 py-4 md:min-h-20 ${tableColumns} md:items-center md:px-3 md:py-3`}>
    <Link href={`/voice-qa/calls/${call.id}`} className="min-w-0 rounded-lg focus-ring"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted md:hidden">Call</span><p className="truncate text-sm font-semibold text-slate-800" title={call.original_filename}>{call.original_filename}</p><p className="mt-1 text-xs text-muted md:hidden">{assignee}</p></Link>
    <div className="text-xs text-muted"><span className="mr-2 font-semibold uppercase tracking-[0.1em] text-muted md:hidden">Date</span>{new Date(call.created_at).toLocaleDateString("en-US")}</div>
    <div className="text-xs text-muted"><span className="mr-2 font-semibold uppercase tracking-[0.1em] text-muted md:hidden"><UserRound className="mr-1 inline" size={13} />Assignee</span>{assignee}</div>
    <div><span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted md:hidden">Status</span><span className={`status-badge ${statusClass(call)}`}>{statusIcon(call)}{formatCallOutcome(status)}</span></div>
    <div className="text-sm font-semibold"><span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted md:hidden">Score</span>{call.overall_score === null ? "—" : `${call.overall_score}%`}</div>
    <div className="flex items-center justify-end gap-2"><span className="mr-auto text-[10px] font-semibold uppercase tracking-[0.1em] text-muted md:hidden">Action</span><Link href={`/voice-qa/calls/${call.id}`} className="focus-ring inline-flex items-center rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-semibold text-slate-700 hover:border-[var(--line-strong)] hover:bg-[var(--accent-soft)]">{call.overall_score === null ? "View" : "Review"} <span className="ml-2">→</span></Link><DeleteRecordingButton callId={call.id} onDeleted={onDeleted} /></div>
  </div>;
}

function statusClass(call: Call) { return call.verdict === "QUALIFIED" ? "text-emerald-700" : call.verdict === "NEEDS_REVIEW" ? "text-amber-700" : call.verdict === "NOT_QUALIFIED" ? "text-red-700" : "text-blue-700"; }
function statusIcon(call: Call) { return call.verdict === "QUALIFIED" ? <CheckCircle2 size={13} /> : call.verdict === "NEEDS_REVIEW" ? <AlertCircle size={13} /> : call.verdict === "NOT_QUALIFIED" ? <XCircle size={13} /> : null; }
function Pagination({ pageInfo, onPrevious, onNext }: { pageInfo: ReturnType<typeof getPageInfo>; onPrevious: () => void; onNext: () => void }) { return <div className="mt-5 flex items-center justify-between border-t border-[var(--line)] pt-4 text-xs text-muted"><span>Page {pageInfo.page} of {pageInfo.pageCount}</span><div className="flex gap-2"><button type="button" disabled={!pageInfo.hasPrevious} onClick={onPrevious} className="focus-ring flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft size={14} /> Previous</button><button type="button" disabled={!pageInfo.hasNext} onClick={onNext} className="focus-ring flex items-center gap-1 rounded-lg border border-[var(--line)] px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Next <ChevronRight size={14} /></button></div></div>; }
