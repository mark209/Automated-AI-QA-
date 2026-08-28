export type QualificationStatus = "QUALIFIED" | "NOT_QUALIFIED" | "NEEDS_REVIEW";
export type QualificationOutcome = "PASS" | "FAIL" | "NEEDS_REVIEW" | "CAPTURED";

export type QualificationInput = {
  unsecuredDebt: number | null;
  employmentStatus: string | null;
  incomeType: string | null;
  monthlyIncome: number | null;
  monthsBehind: number | null;
  monthlyPayment: number | null;
  awareNotFree: boolean | null;
  awareNotLoan: boolean | null;
};

export type QualificationCriterionResult = {
  key: string;
  label: string;
  required: boolean;
  outcome: QualificationOutcome;
  value: unknown;
  reason: string;
  evidence?: unknown;
  sort_order?: number;
};

export type QualificationResult = {
  status: QualificationStatus;
  rulesVersion: "debt-relief-v1";
  criteria: QualificationCriterionResult[];
};

export const qualificationCriteria = [
  { key: "unsecured_debt", label: "Total unsecured debt", required: true },
  { key: "income", label: "Current employment or income", required: true },
  { key: "months_behind", label: "Months behind on payments", required: false },
  { key: "monthly_payment", label: "Affordable monthly payment", required: true },
  { key: "not_free_acknowledgment", label: "Acknowledges the service is not free", required: true },
  { key: "not_loan_acknowledgment", label: "Acknowledges the service is not a loan", required: true },
] as const;

function numericOutcome(value: number | null, predicate: (value: number) => boolean, reason: string, criterion: typeof qualificationCriteria[number], displayValue: unknown): QualificationCriterionResult {
  if (value === null || !Number.isFinite(value)) return { ...criterion, outcome: "NEEDS_REVIEW", value: displayValue, reason: "The call did not provide a clear numeric value." };
  return { ...criterion, outcome: predicate(value) ? "PASS" : "FAIL", value: displayValue, reason };
}

export function evaluateQualification(input: QualificationInput): QualificationResult {
  const debt = qualificationCriteria[0];
  const income = qualificationCriteria[1];
  const months = qualificationCriteria[2];
  const payment = qualificationCriteria[3];
  const notFree = qualificationCriteria[4];
  const notLoan = qualificationCriteria[5];

  const criteria: QualificationCriterionResult[] = [
    numericOutcome(input.unsecuredDebt, (value) => value >= 10_000, "Requires at least $10,000 in unsecured debt.", debt, input.unsecuredDebt),
    {
      ...income,
      outcome: input.monthlyIncome === null || (!input.employmentStatus?.trim() && !input.incomeType?.trim())
        ? "NEEDS_REVIEW"
        : input.monthlyIncome >= 1_500 ? "PASS" : "FAIL",
      value: { employmentStatus: input.employmentStatus, incomeType: input.incomeType, monthlyIncome: input.monthlyIncome },
      reason: input.monthlyIncome === null || (!input.employmentStatus?.trim() && !input.incomeType?.trim()) ? "A clear current income source and monthly amount are required." : "Requires a current income source and at least $1,500 monthly income.",
    },
    {
      ...months,
      outcome: input.monthsBehind === null || !Number.isFinite(input.monthsBehind) ? "NEEDS_REVIEW" : "CAPTURED",
      value: input.monthsBehind,
      reason: "Captured for context; no minimum months-behind threshold applies.",
    },
    numericOutcome(input.monthlyPayment, (value) => value >= 250 && value <= 300, "Requires an affordable monthly payment between $250 and $300 inclusive.", payment, input.monthlyPayment),
    {
      ...notFree,
      outcome: input.awareNotFree === true ? "PASS" : input.awareNotFree === false ? "FAIL" : "NEEDS_REVIEW",
      value: input.awareNotFree,
      reason: "The customer must clearly acknowledge that the service is not free.",
    },
    {
      ...notLoan,
      outcome: input.awareNotLoan === true ? "PASS" : input.awareNotLoan === false ? "FAIL" : "NEEDS_REVIEW",
      value: input.awareNotLoan,
      reason: "The customer must clearly acknowledge that the service is not a loan.",
    },
  ];

  const requiredCriteria = criteria.filter((criterion) => criterion.required);
  const status: QualificationStatus = requiredCriteria.some((criterion) => criterion.outcome === "FAIL")
    ? "NOT_QUALIFIED"
    : requiredCriteria.some((criterion) => criterion.outcome === "NEEDS_REVIEW")
      ? "NEEDS_REVIEW"
      : "QUALIFIED";

  return { status, rulesVersion: "debt-relief-v1", criteria };
}
