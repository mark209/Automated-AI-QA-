import type { CallStatus } from "./processing-jobs";

export function formatTranscriptTime(seconds: number) {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function transcriptStateLabel(status: CallStatus) {
  if (status === "TRANSCRIBING") return "Transcribing recording";
  if (status === "TRANSCRIPTION_FAILED") return "Transcription failed";
  if (status === "TRANSCRIBED") return "Transcript ready";
  if (status === "ANALYZING") return "Evaluating call";
  if (status === "COMPLETED") return "Evaluation complete";
  if (status === "ANALYSIS_FAILED") return "Evaluation failed";
  if (status === "QUEUED") return "Waiting to transcribe";
  return "Transcript unavailable";
}
