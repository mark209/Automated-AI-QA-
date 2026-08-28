export type TemplateCriterionDraft = {
  weight: number;
  active: boolean;
};

export type TemplateValidationResult = {
  valid: boolean;
  totalWeight: number;
  errors: string[];
};

export function templateBelongsToOrganization(templateOrganizationId: string | null | undefined, organizationId: string) {
  return Boolean(templateOrganizationId && templateOrganizationId === organizationId);
}

export function validateTemplate(criteria: TemplateCriterionDraft[]): TemplateValidationResult {
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const totalWeight = activeCriteria.reduce((total, criterion) => total + criterion.weight, 0);
  const errors: string[] = [];

  if (activeCriteria.length === 0 || Math.abs(totalWeight - 100) > 0.001) {
    errors.push("Active criteria weights must total 100% before activation.");
  }

  if (criteria.some((criterion) => criterion.weight < 0 || criterion.weight > 100)) {
    errors.push("Criterion weights must be between 0% and 100%.");
  }

  return { valid: errors.length === 0, totalWeight, errors };
}
