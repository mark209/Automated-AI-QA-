"use client";

import { Loader2, Trash2 } from "lucide-react";
import React, { useState } from "react";

export function DeleteRecordingButton({ callId, onDeleted, showLabel = false }: { callId: string; onDeleted: () => void; showLabel?: boolean }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function deleteRecording() {
    if (!window.confirm("Delete this recording and its transcript and evaluation? This cannot be undone.")) return;
    setDeleting(true); setError("");
    const response = await fetch(`/api/voice-qa/calls/${callId}`, { method: "DELETE" });
    const result = await response.json().catch(() => null);
    setDeleting(false);
    if (!response.ok) { setError(result?.error ?? "Unable to delete recording."); return; }
    onDeleted();
  }

  return <span className="flex items-center gap-2"><button type="button" aria-label="Delete recording" title="Delete recording" disabled={deleting} onClick={(event) => { event.preventDefault(); event.stopPropagation(); void deleteRecording(); }} className="focus-ring inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}{showLabel && "Delete"}</button>{error && <span role="alert" className="sr-only">{error}</span>}</span>;
}
