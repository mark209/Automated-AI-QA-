export type TemplateRow = { id: string; name: string; description: string | null; passing_score: number; active_version_id: string | null };
export type TemplateVersionRow = { id: string; template_id: string; version_number: number; is_active: boolean };
export type TemplateOption = { id: string; name: string; description: string | null; passingScore: number; versionId: string; versionNumber: number; active: boolean };

export function buildTemplateOptions(templates: TemplateRow[], versions: TemplateVersionRow[], activeOnly = true): TemplateOption[] {
  return templates.flatMap((template) => versions.filter((version) => version.template_id === template.id && (!activeOnly || version.is_active || version.id === template.active_version_id)).map((version) => ({ id: template.id, name: template.name, description: template.description, passingScore: Number(template.passing_score), versionId: version.id, versionNumber: version.version_number, active: version.is_active })));
}
