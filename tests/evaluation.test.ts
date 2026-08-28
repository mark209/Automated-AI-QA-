import { describe, expect, it } from "vitest";
import { evaluateTemplateResults, getEvaluationModel, mergeQualificationEvidence, type EvaluationCriterion } from "@/lib/openai/evaluation";
import { evaluateQualification, type QualificationInput } from "@/lib/voice-qa/qualification";

const qualifiedInput: QualificationInput = {
  unsecuredDebt: 15000,
  employmentStatus: "Employed",
  incomeType: "Salary",
  monthlyIncome: 3000,
  monthsBehind: 2,
  monthlyPayment: 250,
  awareNotFree: true,
  awareNotLoan: true,
};

describe("qualification evidence", () => {
  it("evaluates every criterion from the selected template", () => {
    const criteria: EvaluationCriterion[] = [
      { id: "greeting", name: "Greeting", description: "Open professionally", rules: ["Use a professional greeting"], weight: 40, evaluationType: "PASS_FAIL", blocking: true, sortOrder: 0 },
      { id: "closing", name: "Closing", description: "Close clearly", rules: ["Confirm next steps"], weight: 60, evaluationType: "PASS_FAIL", blocking: false, sortOrder: 1 },
    ];
    const result = evaluateTemplateResults(criteria, [
      { criterionId: "greeting", outcome: "PASS", value: true, reason: "Greeting present", evidence: { quote: "Hello", startSeconds: 0, endSeconds: 1 } },
      { criterionId: "closing", outcome: "PASS", value: true, reason: "Closing present", evidence: { quote: "Next steps", startSeconds: 10, endSeconds: 11 } },
    ], 80, "template-v1");

    expect(result.status).toBe("QUALIFIED");
    expect(result.overallScore).toBe(100);
    expect(result.criteria.map((criterion) => criterion.key)).toEqual(["greeting", "closing"]);
  });

  it("marks a required criterion for review when the model omits evidence", () => {
    const result = evaluateTemplateResults([{ id: "policy", name: "Policy", description: null, rules: [], weight: 100, evaluationType: "PASS_FAIL", blocking: true, sortOrder: 0 }], [{ criterionId: "policy", outcome: "PASS", value: true, reason: "Mentioned", evidence: null }], 80, "template-v1");

    expect(result.status).toBe("NEEDS_REVIEW");
    expect(result.criteria[0].outcome).toBe("NEEDS_REVIEW");
  });

  it("uses the safe default when the evaluation model setting is empty", () => {
    expect(getEvaluationModel("")).toBe("gpt-4o-mini");
  });

  it("moves a rule result to needs review when the model provides no evidence", () => {
    const result = evaluateQualification(qualifiedInput);
    const merged = mergeQualificationEvidence(result, {});

    expect(merged.status).toBe("NEEDS_REVIEW");
    expect(merged.criteria.find((criterion) => criterion.key === "unsecured_debt")?.outcome).toBe("NEEDS_REVIEW");
  });
});
