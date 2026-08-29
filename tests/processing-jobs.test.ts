import { describe, expect, it } from "vitest";
import { canTransitionJob, getProcessingEstimate, nextCallStatus } from "@/lib/voice-qa/processing-jobs";

describe("processing job state transitions", () => {
  it("moves a queued transcription job into processing", () => {
    expect(canTransitionJob("QUEUED", "PROCESSING")).toBe(true);
    expect(nextCallStatus("QUEUED", "TRANSCRIPTION")).toBe("TRANSCRIBING");
  });

  it("does not allow a completed job to be queued again", () => {
    expect(canTransitionJob("COMPLETED", "QUEUED")).toBe(false);
  });

  it("allows failed jobs to retry", () => {
    expect(canTransitionJob("FAILED", "QUEUED")).toBe(true);
  });

  it("estimates completion from the recording duration and current stage", () => {
    expect(getProcessingEstimate("TRANSCRIBING", 180, 0)).toEqual({
      label: "About 1 minute remaining",
      seconds: 60,
    });
    expect(getProcessingEstimate("ANALYZING", 180, 0)).toEqual({
      label: "About 30 seconds remaining",
      seconds: 30,
    });
  });
});
