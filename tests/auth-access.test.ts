import { describe, expect, it } from "vitest";
import { shouldRequireAuthentication } from "@/lib/auth/access";

describe("authentication route access", () => {
  it("protects application pages but leaves login and API routes available", () => {
    expect(shouldRequireAuthentication("/")).toBe(true);
    expect(shouldRequireAuthentication("/voice-qa/analyze")).toBe(true);
    expect(shouldRequireAuthentication("/login")).toBe(false);
    expect(shouldRequireAuthentication("/api/voice-qa/calls")).toBe(false);
  });
});
