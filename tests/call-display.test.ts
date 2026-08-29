import { describe, expect, test } from "vitest";
import { formatCallOutcome, formatCallMeta } from "@/lib/voice-qa/call-display";

describe("call display formatting", () => {
  test("uses friendly outcome labels", () => {
    expect(formatCallOutcome("NOT_QUALIFIED")).toBe("Not qualified");
    expect(formatCallOutcome("TRANSCRIPTION_FAILED")).toBe("Transcription failed");
  });

  test("omits the agent label when no agent is assigned", () => {
    expect(formatCallMeta(null, "2026-08-29T00:00:00.000Z")).toBe("8/29/2026");
  });
});
