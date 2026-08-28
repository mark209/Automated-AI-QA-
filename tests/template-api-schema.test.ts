import { describe, expect, it } from "vitest";
import { templatePayloadSchema } from "@/lib/voice-qa/template-api-schema";

describe("templatePayloadSchema", () => {
  it("requires a name and criteria weights", () => {
    const result = templatePayloadSchema.safeParse({ name: "", criteria: [] });
    expect(result.success).toBe(false);
  });

  it("accepts a complete version payload", () => {
    const result = templatePayloadSchema.safeParse({
      name: "Customer Service",
      description: "Standard evaluation",
      passingScore: 80,
      activate: true,
      criteria: [{ name: "Greeting", description: "Open well", weight: 100, evaluationType: "PASS_FAIL", blocking: false, active: true, rules: ["Use a professional greeting"] }],
    });
    expect(result.success).toBe(true);
  });
});
