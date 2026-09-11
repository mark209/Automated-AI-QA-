import type { CallStatus } from "./processing-jobs";

type Job = { status: string; created_at: string; started_at: string | null };

export function getJobProgress(status: CallStatus, transcription: Job | null, evaluation: Job | null, now = Date.now()) {
  const job = evaluation ?? transcription;
  if (!job) return { status, notice: null };
  const evaluating = Boolean(evaluation);
  const states: Record<string, CallStatus> = {
    QUEUED: evaluating ? "TRANSCRIBED" : "QUEUED",
    PROCESSING: evaluating ? "ANALYZING" : "TRANSCRIBING",
    FAILED: evaluating ? "ANALYSIS_FAILED" : "TRANSCRIPTION_FAILED",
    COMPLETED: evaluating ? "COMPLETED" : "TRANSCRIBED",
  };
  const resolved = states[job.status] ?? status;
  const age = now - Date.parse(job.started_at ?? job.created_at);
  const notice = job.status === "QUEUED"
    ? age > 120000
      ? "Processing is delayed. Your recording is saved, but has not been picked up yet. Please contact your administrator."
      : "Waiting for processing to start. Your recording is saved."
    : job.status === "PROCESSING" && age > 900000
      ? "Processing is taking longer than expected. Please contact your administrator if this continues."
      : null;
  return { status: resolved, notice };
}
