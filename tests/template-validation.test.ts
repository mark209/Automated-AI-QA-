import { describe, expect, it } from "vitest";
import { templateBelongsToOrganization, validateTemplate } from "@/lib/voice-qa/template-validation";

describe("validateTemplate", () => {
  it("matches a selected template to the authenticated organization", () => {
    expect(templateBelongsToOrganization("org-1", "org-1")).toBe(true);
    expect(templateBelongsToOrganization("org-2", "org-1")).toBe(false);
  });

  it("accepts an active template whose active criteria total 100 percent", () => {
    expect(validateTemplate([
      { weight: 60, active: true },
      { weight: 40, active: true },
    ])).toEqual({ valid: true, totalWeight: 100, errors: [] });
  });

  it("rejects activation when active criteria do not total 100 percent", () => {
    expect(validateTemplate([
      { weight: 60, active: true },
      { weight: 30, active: true },
    ])).toEqual({
      valid: false,
      totalWeight: 90,
      errors: ["Active criteria weights must total 100% before activation."],
    });
  });
});
