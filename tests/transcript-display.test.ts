import { describe, expect, it } from "vitest";
import { formatTranscriptTime, transcriptStateLabel } from "@/lib/voice-qa/transcript-display";

describe("transcript display helpers", () => {
  it("formats transcript seconds as a timestamp", () => {
    expect(formatTranscriptTime(0)).toBe("00:00");
    expect(formatTranscriptTime(75.4)).toBe("01:15");
    expect(formatTranscriptTime(3661)).toBe("61:01");
  });

  it("labels the evaluation phase separately from transcription", () => {
    expect(transcriptStateLabel("ANALYZING")).toBe("Evaluating call");
    expect(transcriptStateLabel("COMPLETED")).toBe("Evaluation complete");
  });

  it("maps processing states to review-friendly labels", () => {
    expect(transcriptStateLabel("TRANSCRIBING")).toBe("Transcribing recording");
    expect(transcriptStateLabel("TRANSCRIPTION_FAILED")).toBe("Transcription failed");
    expect(transcriptStateLabel("TRANSCRIBED")).toBe("Transcript ready");
  });
});
