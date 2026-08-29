export type JobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
export type JobType = "TRANSCRIPTION" | "EVALUATION" | "REPORT_GENERATION";
export type CallStatus = "UPLOADED" | "QUEUED" | "TRANSCRIBING" | "TRANSCRIBED" | "ANALYZING" | "COMPLETED" | "TRANSCRIPTION_FAILED" | "ANALYSIS_FAILED";

const transitions: Record<JobStatus, JobStatus[]> = {
  QUEUED: ["PROCESSING"],
  PROCESSING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["QUEUED"],
};

export function canTransitionJob(from: JobStatus, to: JobStatus) {
  return transitions[from].includes(to);
}

export function nextCallStatus(_current: CallStatus, jobType: JobType): CallStatus {
  if (jobType === "TRANSCRIPTION") return "TRANSCRIBING";
  if (jobType === "EVALUATION") return "ANALYZING";
  return "QUEUED";
}

export function getProcessingEstimate(status: CallStatus, durationSeconds: number | null, queuedJobs = 0) {
  if (!["UPLOADED", "QUEUED", "TRANSCRIBING", "TRANSCRIBED", "ANALYZING"].includes(status)) return null;
  const duration = Math.max(0, durationSeconds ?? 0);
  const stageSeconds = status === "ANALYZING" || status === "TRANSCRIBED" ? Math.max(30, duration / 6) : Math.max(60, duration / 3);
  const seconds = Math.max(30, Math.ceil((stageSeconds + queuedJobs * 30) / 30) * 30);
  const roundedMinutes = Math.round(seconds / 60);
  return { seconds, label: seconds < 60 ? `About ${seconds} seconds remaining` : `About ${roundedMinutes} minute${roundedMinutes === 1 ? "" : "s"} remaining` };
}
