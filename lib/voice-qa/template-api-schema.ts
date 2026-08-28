import { z } from "zod";

const criterionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(""),
  weight: z.number().min(0).max(100),
  evaluationType: z.enum(["PASS_FAIL", "PASS_PARTIAL_FAIL"]),
  blocking: z.boolean().default(false),
  active: z.boolean().default(true),
  rules: z.array(z.string().trim().min(1).max(500)).default([]),
});

export const templatePayloadSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  passingScore: z.number().min(0).max(100).default(80),
  activate: z.boolean().default(false),
  criteria: z.array(criterionSchema).min(1),
}).superRefine((payload, context) => {
  const activeWeight = payload.criteria.filter((criterion) => criterion.active).reduce((total, criterion) => total + criterion.weight, 0);
  if (payload.activate && Math.abs(activeWeight - 100) > 0.001) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["criteria"], message: "Active criteria weights must total 100% before activation." });
  }
});

export type TemplatePayload = z.infer<typeof templatePayloadSchema>;
