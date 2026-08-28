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
