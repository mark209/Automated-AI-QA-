import { describe, expect, it } from "vitest";
import { buildTemplatePayload } from "@/lib/voice-qa/template-draft";

describe("template setup payload", () => {
  it("preserves criterion rules when saving a template draft", () => {
    const payload = buildTemplatePayload({
      name: "Debt relief qualification",
      description: "Qualification call review",
      passingScore: 80,
      activate: true,
      criteria: [
        {
          id: 1,
          name: "Unsecured debt",
          description: "Confirm qualifying unsecured debt.",
          weight: 20,
          evaluationType: "PASS_FAIL",
          blocking: true,
          active: true,
          rules: ["Combined unsecured debt is at least $10,000."],
        },
      ],
    });

    expect(payload.criteria[0].rules).toEqual(["Combined unsecured debt is at least $10,000."]);
    expect(payload.activate).toBe(true);
  });
});
