import { describe, expect, it } from "vitest";
import { buildTemplateOptions } from "@/lib/voice-qa/template-options";

describe("template options", () => {
  it("maps saved templates and versions into selector options", () => {
    const options = buildTemplateOptions(
      [{ id: "template-1", name: "Debt relief", description: "Rules", passing_score: 80, active_version_id: "version-2" }],
      [
        { id: "version-1", template_id: "template-1", version_number: 1, is_active: false },
        { id: "version-2", template_id: "template-1", version_number: 2, is_active: true },
      ],
    );

    expect(options).toEqual([{ id: "template-1", name: "Debt relief", description: "Rules", passingScore: 80, versionId: "version-2", versionNumber: 2, active: true }]);
  });
});
