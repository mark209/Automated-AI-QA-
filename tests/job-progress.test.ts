import { describe, expect, it } from "vitest";
import { getJobProgress } from "@/lib/voice-qa/job-progress";

const now = Date.parse("2026-09-11T12:00:00Z");
const queued = { status: "QUEUED", created_at: "2026-09-11T11:00:00Z", started_at: null };
describe("persisted job progress", () => {
  it("corrects a stale uploaded call and reports an unclaimed job", () => {
    const result = getJobProgress("UPLOADED", queued, null, now);
    expect(result.status).toBe("QUEUED");
    expect(result.notice).toContain("not been picked up");
  });
  it("uses evaluation state after transcription completes", () => {
    expect(getJobProgress("TRANSCRIBED", { ...queued, status: "COMPLETED" }, { ...queued, status: "FAILED" }, now).status).toBe("ANALYSIS_FAILED");
  });
  it("does not claim that a new queued recording has started", () => {
    expect(getJobProgress("QUEUED", { ...queued, created_at: new Date(now).toISOString() }, null, now).notice).toContain("Waiting");
  });
  it("clears the delay message when the job completes", () => {
    expect(getJobProgress("ANALYZING", null, { ...queued, status: "COMPLETED" }, now)).toEqual({status:"COMPLETED",notice:null});
  });
});
