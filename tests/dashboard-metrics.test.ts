import { describe, expect, it } from "vitest";
import { summarizeCalls } from "@/lib/voice-qa/dashboard-metrics";

describe("dashboard metrics", () => {
  it("summarizes completed calls and pending review calls", () => {
    const summary = summarizeCalls([
      { status: "COMPLETED", verdict: "QUALIFIED", overall_score: 92 },
      { status: "COMPLETED", verdict: "NOT_QUALIFIED", overall_score: 61 },
      { status: "COMPLETED", verdict: "NEEDS_REVIEW", overall_score: null },
      { status: "ANALYZING", verdict: null, overall_score: null },
    ]);

    expect(summary.totalCalls).toBe(4);
    expect(summary.averageScore).toBe(76.5);
    expect(summary.needsReview).toBe(2);
    expect(summary.qualified).toBe(1);
  });
});
