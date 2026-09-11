"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Clock3, FileAudio, RefreshCw } from "lucide-react";
import { ProcessingStatus } from "@/components/voice-qa/processing-status";
import { QualificationSummary } from "@/components/voice-qa/qualification-summary";
import { TranscriptViewer, type TranscriptSegment } from "@/components/voice-qa/transcript-viewer";
import { DeleteRecordingButton } from "@/components/voice-qa/delete-recording-button";
import type { CallStatus } from "@/lib/voice-qa/processing-jobs";
import { formatTranscriptTime } from "@/lib/voice-qa/transcript-display";
import type { QualificationCriterionResult, QualificationStatus } from "@/lib/voice-qa/qualification";

type ReviewData = {
  processingNotice?: string | null;
  call: { id: string; status: CallStatus; original_filename: string; duration_seconds: number | null; created_at: string };
  transcript: { id: string; language: string | null; model: string; status: string; duration_seconds: number | null; detected_speakers: number | null; completed_at: string | null; transcript_segments: TranscriptSegment[] } | null;
  job: { id: string; status: string; attempts: number; error_message: string | null } | null;
  evaluationJob: { id: string; status: string; attempts: number; error_message: string | null } | null;
  qualification: { id: string; rules_version: string; status: QualificationStatus; input: Record<string, unknown>; created_at: string; updated_at: string; qualification_criteria_results: QualificationCriterionResult[] } | null;
};

export default function CallReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const [callId, setCallId] = useState("");
  const [data, setData] = useState<ReviewData | null>(null);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [audioError, setAudioError] = useState("");
  const audioRef = useRef<HTMLAudioElement>(null);

  const load = useCallback(async (id: string) => {
    const response = await fetch(`/api/voice-qa/calls/${id}/transcript`, { cache: "no-store" });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setError(result?.error ?? "Unable to load this call."); return; }
    setData(result);
  }, []);

  useEffect(() => { void params.then(({ id }) => { setCallId(id); void load(id); }); }, [load, params]);
  useEffect(() => { if (!callId || !data || ["COMPLETED", "TRANSCRIPTION_FAILED", "ANALYSIS_FAILED"].includes(data.call.status)) return; const timer = window.setInterval(() => void load(callId), 5000); return () => window.clearInterval(timer); }, [callId, data, load]);

  async function retry() {
    if (!callId) return;
    setRetrying(true);
    const response = await fetch(`/api/voice-qa/calls/${callId}/retry`, { method: "POST" });
    const result = await response.json().catch(() => null);
    setRetrying(false);
    if (!response.ok) setError(result?.error ?? "Unable to retry analysis."); else { setError(""); await load(callId); }
  }

  async function playAt(seconds: number) {
    setSelectedTimestamp(seconds);
    setAudioError("");
    let url = audioUrl;
    if (!url) {
      const response = await fetch(`/api/voice-qa/calls/${callId}/audio`, { cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) { setAudioError(result?.error ?? "Unable to access the recording."); return; }
      url = result.url;
      setAudioUrl(url);
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== url) { audio.src = url; audio.load(); }
    if (audio.readyState < 1) await new Promise<void>((resolve) => audio.addEventListener("loadedmetadata", () => resolve(), { once: true }));
    audio.currentTime = seconds;
    await audio.play().catch(() => setAudioError("Playback was blocked. Use the audio controls to start the recording."));
  }

  if (error && !data) return <section className="mx-auto max-w-4xl px-6 py-10"><Link href="/voice-qa/calls" className="flex items-center gap-2 text-sm text-blue-700"><ArrowLeft size={16} /> Call history</Link><div role="alert" className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div></section>;
  if (!data) return <section className="mx-auto max-w-4xl px-6 py-10"><Link href="/voice-qa/calls" className="flex items-center gap-2 text-sm text-blue-700"><ArrowLeft size={16} /> Call history</Link><div className="surface mt-8 flex min-h-64 items-center justify-center rounded-xl text-sm text-muted"><RefreshCw className="mr-2 animate-spin" size={17} /> Loading call…</div></section>;

  const segments = [...(data.transcript?.transcript_segments ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return <section className="mx-auto max-w-5xl px-6 py-10"><Link href="/voice-qa/calls" className="flex items-center gap-2 text-sm text-blue-700"><ArrowLeft size={16} /> Call history</Link><header className="call-review-header mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start"><div className="min-w-0"><div className="flex min-w-0 items-start gap-3"><FileAudio className="mt-1 shrink-0 text-blue-600" size={22} /><div className="min-w-0"><h1 className="truncate font-display text-3xl font-semibold tracking-[-0.04em]" title={data.call.original_filename}>{data.call.original_filename}</h1><p className="mt-2 text-sm text-muted">Call ID {data.call.id}</p></div></div></div><div className="call-review-actions flex flex-wrap items-center gap-2 lg:justify-end"><span className="surface inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted"><span>{new Date(data.call.created_at).toLocaleDateString("en-US")}</span></span><span className="surface inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted"><Clock3 size={16} /> {data.call.duration_seconds ? `${Math.round(data.call.duration_seconds)} seconds` : "Duration pending"}</span><DeleteRecordingButton callId={data.call.id} showLabel onDeleted={() => window.location.assign("/voice-qa/calls")} /></div></header><div className="mt-6"><ProcessingStatus notice={data.processingNotice} status={data.call.status} durationSeconds={data.call.duration_seconds} error={data.call.status === "ANALYSIS_FAILED" ? data.evaluationJob?.error_message : data.job?.error_message} retrying={retrying} onRetry={retry} /></div>{data.qualification && <div className="mt-5"><QualificationSummary status={data.qualification.status} rulesVersion={data.qualification.rules_version} criteria={[...data.qualification.qualification_criteria_results].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))} /></div>}{data.transcript && <div className="mt-5 grid gap-5 sm:grid-cols-3"><div className="surface rounded-xl p-4"><p className="text-xs text-muted">Model</p><p className="mt-1 text-sm font-semibold">{data.transcript.model}</p></div><div className="surface rounded-xl p-4"><p className="text-xs text-muted">Language</p><p className="mt-1 text-sm font-semibold">{data.transcript.language ?? "Detected automatically"}</p></div><div className="surface rounded-xl p-4"><p className="text-xs text-muted">Speakers detected</p><p className="mt-1 text-sm font-semibold">{data.transcript.detected_speakers ?? "—"}</p></div></div>}{data.transcript && <div className="mt-5"><div className="surface mb-5 rounded-xl p-5"><p className="text-sm font-semibold">Recording playback</p><audio ref={audioRef} controls preload="metadata" className="mt-3 w-full" aria-label="Call recording" />{audioError && <p role="alert" className="mt-2 text-sm text-red-700">{audioError}</p>}</div><TranscriptViewer segments={segments} onPlay={playAt} />{selectedTimestamp !== null && <p role="status" className="mt-3 text-sm text-muted">Playing from {formatTranscriptTime(selectedTimestamp)}.</p>}</div>}</section>;
}
