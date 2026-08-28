export type DashboardCall = { status: string; verdict: string | null; overall_score: number | null };

export function summarizeCalls(calls: DashboardCall[]) {
  const scored = calls.filter((call) => typeof call.overall_score === "number");
  const averageScore = scored.length ? Math.round((scored.reduce((total, call) => total + Number(call.overall_score), 0) / scored.length) * 10) / 10 : null;
  return {
    totalCalls: calls.length,
    averageScore,
    qualified: calls.filter((call) => call.verdict === "QUALIFIED").length,
    needsReview: calls.filter((call) => call.verdict === "NEEDS_REVIEW" || ["UPLOADED", "QUEUED", "TRANSCRIBING", "TRANSCRIBED", "ANALYZING"].includes(call.status)).length,
    failed: calls.filter((call) => ["NOT_QUALIFIED", "TRANSCRIPTION_FAILED", "ANALYSIS_FAILED"].includes(call.verdict ?? call.status)).length,
  };
}
