import { describe, expect, it } from "vitest";
import { CALLS_PAGE_SIZE, getPageInfo, canDeleteRecording } from "@/lib/voice-qa/call-list";

describe("call list pagination and access", () => {
  it("uses five recordings per page and clamps page navigation", () => {
    expect(CALLS_PAGE_SIZE).toBe(5);
    expect(getPageInfo(12, 1)).toEqual({ page: 1, pageCount: 3, from: 0, to: 5, hasPrevious: false, hasNext: true });
    expect(getPageInfo(12, 9)).toEqual({ page: 3, pageCount: 3, from: 10, to: 12, hasPrevious: true, hasNext: false });
  });

  it("allows only administrators and supervisors to delete recordings", () => {
    expect(canDeleteRecording("ADMIN")).toBe(true);
    expect(canDeleteRecording("QA_SUPERVISOR")).toBe(true);
    expect(canDeleteRecording("QA_ANALYST")).toBe(false);
    expect(canDeleteRecording("VIEWER")).toBe(false);
  });
});
