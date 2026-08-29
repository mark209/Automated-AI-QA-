"use client";

import { AlertCircle, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { getProcessingEstimate, type CallStatus } from "@/lib/voice-qa/processing-jobs";
import { transcriptStateLabel } from "@/lib/voice-qa/transcript-display";

export function ProcessingStatus({ status, durationSeconds, error, retrying, onRetry }: { status: CallStatus; durationSeconds?: number | null; error?: string | null; retrying?: boolean; onRetry?: () => void }) {
  const failed = status === "TRANSCRIPTION_FAILED" || status === "ANALYSIS_FAILED";
  const ready = status === "COMPLETED";
  const estimate = getProcessingEstimate(status, durationSeconds ?? null);
  return <div className={`rounded-xl border p-4 ${failed ? "border-red-200 bg-red-50" : ready ? "border-emerald-200 bg-emerald-50" : "border-blue-200 bg-blue-50"}`} role={failed ? "alert" : "status"}><div className="flex items-start gap-3">{failed ? <AlertCircle className="mt-0.5 text-red-600" size={19} /> : ready ? <CheckCircle2 className="mt-0.5 text-emerald-600" size={19} /> : <Loader2 className="mt-0.5 animate-spin text-blue-600" size={19} />}<div className="min-w-0 flex-1"><p className={`text-sm font-semibold ${failed ? "text-red-800" : ready ? "text-emerald-800" : "text-blue-800"}`}>{transcriptStateLabel(status)}</p>{error && <p className="mt-1 text-xs text-red-700">{error}</p>}{!failed && !ready && <p className="mt-1 text-xs text-blue-700">{estimate?.label ?? "Usually completed within a few minutes"}. This page refreshes automatically.</p>}</div>{failed && onRetry && <button disabled={retrying} onClick={onRetry} className="focus-ring flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-60">{retrying ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Retry</button>}</div></div>;
}
