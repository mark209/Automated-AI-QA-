export type TemplateCriterionDraft = {
  id: number;
  name: string;
  description: string;
  weight: number;
  evaluationType: "PASS_FAIL" | "PASS_PARTIAL_FAIL";
  blocking: boolean;
  active: boolean;
  rules: string[];
};

export type TemplateDraftInput = {
  name: string;
  description: string;
  passingScore: number;
  activate: boolean;
  criteria: TemplateCriterionDraft[];
};

export function buildTemplatePayload(input: TemplateDraftInput) {
  return {
    name: input.name,
    description: input.description,
    passingScore: input.passingScore,
    activate: input.activate,
    criteria: input.criteria.map(({ id: _id, ...criterion }) => ({
      ...criterion,
      rules: criterion.rules.map((rule) => rule.trim()).filter(Boolean),
    })),
  };
}
