import OpenAI from "openai";
import { z } from "zod";
import { evaluateQualification, type QualificationResult } from "@/lib/voice-qa/qualification";

export type QualificationEvidence = { quote: string; startSeconds: number | null; endSeconds: number | null };

const nullableNumber = z.number().finite().nullable();
const extractionSchema = z.object({
  input: z.object({
    unsecuredDebt: nullableNumber,
    employmentStatus: z.string().nullable(),
    incomeType: z.string().nullable(),
    monthlyIncome: nullableNumber,
    monthsBehind: nullableNumber,
    monthlyPayment: nullableNumber,
    awareNotFree: z.boolean().nullable(),
    awareNotLoan: z.boolean().nullable(),
  }),
  evidence: z.record(z.object({ quote: z.string().min(1), startSeconds: nullableNumber, endSeconds: nullableNumber })).default({}),
});

export type EvaluationExtraction = z.infer<typeof extractionSchema>;

export type EvaluationCriterion = {
  id: string;
  name: string;
  description: string | null;
  rules: string[];
  weight: number;
  evaluationType: "PASS_FAIL" | "PASS_PARTIAL_FAIL";
  blocking: boolean;
  sortOrder: number;
};

export type TemplateCriterionEvaluation = {
  criterionId: string;
  outcome: "PASS" | "FAIL" | "NEEDS_REVIEW" | "CAPTURED";
  value?: unknown;
  reason: string;
  evidence?: QualificationEvidence | null;
};

export function getEvaluationModel(configuredModel = process.env.OPENAI_EVALUATION_MODEL) {
  return configuredModel?.trim() || "gpt-4o-mini";
}

export function evaluateTemplateResults(criteria: EvaluationCriterion[], modelResults: TemplateCriterionEvaluation[], passingScore: number, rulesVersion: string) {
  const resultsById = new Map(modelResults.map((result) => [result.criterionId, result]));
  const results = criteria.map((criterion) => {
    const modelResult = resultsById.get(criterion.id);
    const evidence = modelResult?.evidence ?? null;
    const needsEvidence = modelResult?.outcome === "PASS" || modelResult?.outcome === "FAIL" || modelResult?.outcome === "CAPTURED";
    const outcome = !modelResult
      ? "NEEDS_REVIEW" as const
      : needsEvidence && !evidence
        ? "NEEDS_REVIEW" as const
        : modelResult.outcome;
    return {
      key: criterion.id,
      label: criterion.name,
      required: criterion.blocking,
      outcome,
      value: modelResult?.value ?? null,
      reason: !modelResult ? "The evaluator did not return a result for this criterion." : outcome === "NEEDS_REVIEW" && needsEvidence && !evidence ? "The call suggested a result, but no supporting transcript evidence was returned." : modelResult.reason,
      evidence: evidence ?? undefined,
      sort_order: criterion.sortOrder,
    } satisfies QualificationResult["criteria"][number];
  });
  const totalWeight = criteria.reduce((total, criterion) => total + criterion.weight, 0);
  const passedWeight = results.reduce((total, result, index) => total + (result.outcome === "PASS" ? criteria[index].weight : 0), 0);
  const overallScore = totalWeight ? Math.round((passedWeight / totalWeight) * 1000) / 10 : 0;
  const status = results.some((result) => result.required && result.outcome === "FAIL")
    ? "NOT_QUALIFIED" as const
    : results.some((result) => result.required && result.outcome === "NEEDS_REVIEW")
      ? "NEEDS_REVIEW" as const
      : overallScore < passingScore
        ? "NOT_QUALIFIED" as const
        : "QUALIFIED" as const;
  return { status, rulesVersion, criteria: results, overallScore };
}

export function mergeQualificationEvidence(result: QualificationResult, evidence: Record<string, QualificationEvidence>): QualificationResult {
  const criteria = result.criteria.map((criterion) => {
    const criterionEvidence = evidence[criterion.key];
    if (criterionEvidence) return { ...criterion, evidence: criterionEvidence };
    if (criterion.outcome === "PASS" || criterion.outcome === "FAIL" || criterion.outcome === "CAPTURED") {
      return { ...criterion, outcome: "NEEDS_REVIEW" as const, reason: "The call suggested a result, but no supporting transcript evidence was returned." };
    }
    return criterion;
  });
  const required = criteria.filter((criterion) => criterion.required);
  const status = required.some((criterion) => criterion.outcome === "FAIL") ? "NOT_QUALIFIED" : required.some((criterion) => criterion.outcome === "NEEDS_REVIEW") ? "NEEDS_REVIEW" : "QUALIFIED";
  return { ...result, status, criteria };
}

export async function evaluateTranscript(segments: Array<{ speaker: string; startSeconds: number; endSeconds: number; text: string }>, criteria: EvaluationCriterion[], passingScore: number, rulesVersion: string) {
  const transcript = segments.map((segment) => `[${segment.startSeconds.toFixed(2)}-${segment.endSeconds.toFixed(2)}] ${segment.speaker}: ${segment.text}`).join("\n");
  const criteriaPrompt = criteria.map((criterion) => `${criterion.id}: ${criterion.name}\nDescription: ${criterion.description ?? "No description provided."}\nRules:\n${criterion.rules.map((rule) => `- ${rule}`).join("\n") || "- No additional rules provided."}\nEvaluation type: ${criterion.evaluationType}\nBlocking: ${criterion.blocking}`).join("\n\n");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await openai.chat.completions.create({
    model: getEvaluationModel(),
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "Evaluate the transcript against every supplied QA criterion. Return only valid JSON. Do not infer facts. Every PASS, FAIL, or CAPTURED result must include exact supporting transcript evidence with timestamps. Use NEEDS_REVIEW when the transcript is unclear or silent." },
      { role: "user", content: `Return this shape: {"criteria":[{"criterionId":string,"outcome":"PASS"|"FAIL"|"NEEDS_REVIEW"|"CAPTURED","value":unknown,"reason":string,"evidence":{"quote":string,"startSeconds":number|null,"endSeconds":number|null}|null}]}. Include exactly one result for every criterion ID.\n\nCriteria:\n${criteriaPrompt}\n\nPassing score: ${passingScore}\n\nTranscript:\n${transcript}` },
    ],
  } as never);
  const content = response.choices[0]?.message?.content;
  const parsed = z.object({ criteria: z.array(z.object({ criterionId: z.string().min(1), outcome: z.enum(["PASS", "FAIL", "NEEDS_REVIEW", "CAPTURED"]), value: z.unknown().optional().default(null), reason: z.string().min(1), evidence: z.object({ quote: z.string().min(1), startSeconds: nullableNumber, endSeconds: nullableNumber }).nullable().optional().default(null) })) }).safeParse(content ? JSON.parse(content) : null);
  if (!parsed.success) throw new Error("Evaluation returned an invalid structured result.");
  const knownIds = new Set(criteria.map((criterion) => criterion.id));
  if (parsed.data.criteria.length !== criteria.length || parsed.data.criteria.some((result) => !knownIds.has(result.criterionId)) || new Set(parsed.data.criteria.map((result) => result.criterionId)).size !== criteria.length) throw new Error("Evaluation did not return exactly one result for every template criterion.");
  return { input: { criteria: parsed.data.criteria }, result: evaluateTemplateResults(criteria, parsed.data.criteria, passingScore, rulesVersion) };
}
