import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";
import { templatePayloadSchema } from "@/lib/voice-qa/template-api-schema";

export async function POST(request: Request) {
  const parsed = templatePayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid template data.", details: parsed.error.flatten() }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).in("role", ["ADMIN", "QA_SUPERVISOR"]).limit(1).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify organization membership." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "You do not have permission to manage QA templates." }, { status: 403 });

  const payload = parsed.data;
  const { data: template, error: templateError } = await supabase.from("qa_templates").insert({ organization_id: membership.organization_id, name: payload.name, description: payload.description, passing_score: payload.passingScore }).select("id").single();
  if (templateError || !template) return NextResponse.json({ error: "Unable to create the QA template." }, { status: 500 });

  const { data: version, error: versionError } = await supabase.from("qa_template_versions").insert({ template_id: template.id, version_number: 1, is_active: payload.activate }).select("id").single();
  if (versionError || !version) return NextResponse.json({ error: "Unable to create the template version." }, { status: 500 });

  const criteriaRows = payload.criteria.map((criterion, index) => ({ template_version_id: version.id, name: criterion.name, description: criterion.description, weight: criterion.weight, evaluation_type: criterion.evaluationType, blocking: criterion.blocking, active: criterion.active, sort_order: index }));
  const { data: criteria, error: criteriaError } = await supabase.from("qa_criteria").insert(criteriaRows).select("id");
  if (criteriaError || !criteria) return NextResponse.json({ error: "Unable to save template criteria." }, { status: 500 });

  const ruleRows = criteria.flatMap((criterion, index) => payload.criteria[index].rules.map((rule, ruleIndex) => ({ criterion_id: criterion.id, rule_text: rule, sort_order: ruleIndex })));
  if (ruleRows.length > 0) {
    const { error: rulesError } = await supabase.from("qa_criterion_rules").insert(ruleRows);
    if (rulesError) return NextResponse.json({ error: "Unable to save criterion rules." }, { status: 500 });
  }

  if (payload.activate) {
    const { error: activateError } = await supabase.from("qa_templates").update({ active_version_id: version.id }).eq("id", template.id);
    if (activateError) return NextResponse.json({ error: "Template was saved but could not be activated." }, { status: 500 });
  }

  return NextResponse.json({ id: template.id, versionId: version.id }, { status: 201 });
}
