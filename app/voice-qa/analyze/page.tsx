"use client";

import Link from "next/link";
import React, { FormEvent, useEffect, useState } from "react";
import { CheckCircle2, FileAudio, Loader2, UploadCloud } from "lucide-react";

type AgentOption = { id: string; name: string; external_id: string | null };
type TemplateOption = { versionId: string; name: string; versionNumber: number; active: boolean };
type PageStatus = "idle" | "uploading" | "processing" | "success" | "error";

export default function AnalyzePage() {
  const [file, setFile] = useState<File | null>(null);
  const [agentId, setAgentId] = useState("");
  const [templateVersionId, setTemplateVersionId] = useState("");
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState("");
  const [status, setStatus] = useState<PageStatus>("idle");
  const [message, setMessage] = useState("");
  const [callId, setCallId] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([fetch("/api/voice-qa/agents"), fetch("/api/voice-qa/templates/list?activeOnly=true")])
      .then(async ([agentsResponse, templatesResponse]) => {
        const [agentsResult, templatesResult] = await Promise.all([agentsResponse.json(), templatesResponse.json()]);
        if (!active) return;
        if (!agentsResponse.ok || !templatesResponse.ok) throw new Error(agentsResult?.error ?? templatesResult?.error ?? "Unable to load setup options.");
        setAgents(agentsResult.agents ?? []);
        setTemplates(templatesResult.templates ?? []);
      })
      .catch((error) => { if (active) setOptionsError(error instanceof Error ? error.message : "Unable to load setup options."); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setStatus("error"); setMessage("Choose an MP3, WAV, or M4A recording first."); return; }
    setStatus("uploading");
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    if (agentId) body.set("agentId", agentId);
    body.set("templateVersionId", templateVersionId);
    const uploadResponse = await fetch("/api/voice-qa/calls", { method: "POST", body });
    const uploadResult = await uploadResponse.json().catch(() => null);
    if (!uploadResponse.ok) { setStatus("error"); setMessage(uploadResult?.error ?? "The recording could not be uploaded."); return; }

    setCallId(uploadResult.id);
    setStatus("processing");
    setMessage("Recording uploaded. Starting transcription and evaluation…");
    const queueResponse = await fetch(`/api/voice-qa/calls/${uploadResult.id}/analyze`, { method: "POST" });
    const queueResult = await queueResponse.json().catch(() => null);
    if (!queueResponse.ok) { setStatus("error"); setMessage(queueResult?.error ?? "The recording was uploaded, but processing could not be started."); return; }
    setStatus("success");
    setMessage("Transcription and evaluation started. Follow progress on the call review page.");
  }

  return <section className="mx-auto max-w-3xl px-6 py-10">
    <Link href="/" className="text-sm text-blue-700">← Back to dashboard</Link>
    <div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-0.04em]">Analyze New Call</h1><p className="mt-2 text-sm text-muted">Choose a QA template, then upload once to transcribe and evaluate the recording automatically.</p></div>
    <form className="mt-8 space-y-5" onSubmit={submit}>
      <label className="surface block cursor-pointer rounded-xl border-dashed p-8 text-center hover:border-blue-400 hover:bg-blue-50/30">
        <input type="file" accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4" className="sr-only" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setStatus("idle"); setMessage(""); }} />
        <UploadCloud className="mx-auto text-blue-600" size={32} /><p className="mt-3 font-semibold">{file ? file.name : "Drop an audio recording here"}</p><p className="mt-1 text-sm text-muted">Choose a file · MP3, WAV, or M4A · Maximum 100 MB</p>{file && <p className="mt-3 text-xs text-slate-500">{formatBytes(file.size)} · Ready to process</p>}
      </label>
      <div className="surface rounded-xl p-5"><h2 className="font-display text-base font-semibold">Call setup</h2><p className="mt-1 text-sm text-muted">These selections connect the call to the right reviewer and qualification rules.</p>{optionsError && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{optionsError}</div>}<div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Agent <span className="font-normal text-muted">(optional)</span><select value={agentId} onChange={(event) => setAgentId(event.target.value)} disabled={optionsLoading} className="focus-ring mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-normal outline-none"><option value="">Unassigned</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}{agent.external_id ? ` · ${agent.external_id}` : ""}</option>)}</select></label><label className="text-sm font-medium">QA template <span className="font-normal text-muted">(optional)</span><select value={templateVersionId} onChange={(event) => setTemplateVersionId(event.target.value)} disabled={optionsLoading} className="focus-ring mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2.5 text-sm font-normal outline-none"><option value="">{optionsLoading ? "Loading templates…" : "Select a template"}</option>{templates.map((template) => <option key={template.versionId} value={template.versionId}>{template.name} · v{template.versionNumber}{template.active ? " · Active" : ""}</option>)}</select></label></div></div>
      {message && <div role={status === "error" ? "alert" : "status"} className={`rounded-xl border p-4 text-sm ${status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{status === "success" ? <CheckCircle2 className="mr-2 inline" size={17} /> : null}{message}</div>}
      {callId && <Link href={`/voice-qa/calls/${callId}`} className="focus-ring flex w-full items-center justify-center rounded-lg border border-[var(--line)] px-4 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50">Open call review</Link>}
      <button type="submit" disabled={status === "uploading" || status === "processing" || optionsLoading} className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{status === "uploading" ? <><Loader2 className="animate-spin" size={17} /> Uploading securely…</> : status === "processing" ? <><Loader2 className="animate-spin" size={17} /> Starting transcription &amp; evaluation…</> : <><FileAudio size={17} /> Transcribe &amp; Evaluate</>}</button>
    </form>
  </section>;
}

function formatBytes(bytes: number) { return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
