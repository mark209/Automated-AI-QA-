import { describe, expect, it } from "vitest";
import { evaluateQualification, qualificationCriteria, type QualificationInput } from "@/lib/voice-qa/qualification";

const qualifiedInput: QualificationInput = {
  unsecuredDebt: 12500,
  employmentStatus: "EMPLOYED",
  incomeType: "Wages",
  monthlyIncome: 2200,
  monthsBehind: 2,
  monthlyPayment: 275,
  awareNotFree: true,
  awareNotLoan: true,
};

describe("qualification rules", () => {
  it("passes a customer who meets every required threshold", () => {
    const result = evaluateQualification(qualifiedInput);

    expect(result.status).toBe("QUALIFIED");
    expect(result.criteria.every((criterion) => criterion.outcome !== "FAIL")).toBe(true);
  });

  it("fails debt below ten thousand and payment outside the inclusive range", () => {
    const result = evaluateQualification({ ...qualifiedInput, unsecuredDebt: 9999, monthlyPayment: 301 });

    expect(result.status).toBe("NOT_QUALIFIED");
    expect(result.criteria.find((criterion) => criterion.key === "unsecured_debt")?.outcome).toBe("FAIL");
    expect(result.criteria.find((criterion) => criterion.key === "monthly_payment")?.outcome).toBe("FAIL");
  });

  it("does not use months behind as a disqualifying threshold", () => {
    const result = evaluateQualification({ ...qualifiedInput, monthsBehind: 0 });

    expect(result.status).toBe("QUALIFIED");
    expect(result.criteria.find((criterion) => criterion.key === "months_behind")).toMatchObject({ outcome: "CAPTURED", required: false });
  });

  it("requires both customer disclosures", () => {
    const result = evaluateQualification({ ...qualifiedInput, awareNotFree: false, awareNotLoan: null });

    expect(result.status).toBe("NOT_QUALIFIED");
    expect(result.criteria.find((criterion) => criterion.key === "not_free_acknowledgment")?.outcome).toBe("FAIL");
    expect(result.criteria.find((criterion) => criterion.key === "not_loan_acknowledgment")?.outcome).toBe("NEEDS_REVIEW");
  });

  it("publishes the six client-facing criteria with one informational field", () => {
    expect(qualificationCriteria).toHaveLength(6);
    expect(qualificationCriteria.find((criterion) => criterion.key === "months_behind")?.required).toBe(false);
  });
});
