import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";
import { buildTemplateOptions } from "@/lib/voice-qa/template-options";

export async function GET(request: Request) {
  const activeOnly = new URL(request.url).searchParams.get("activeOnly") !== "false";
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to load organization data." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Organization setup is required." }, { status: 403 });

  const [{ data: templates, error: templateError }, { data: versions, error: versionError }] = await Promise.all([
    supabase.from("qa_templates").select("id, name, description, passing_score, active_version_id").eq("organization_id", membership.organization_id).order("name"),
    supabase.from("qa_template_versions").select("id, template_id, version_number, is_active").order("version_number", { ascending: false }),
  ]);
  if (templateError || versionError) return NextResponse.json({ error: "Unable to load QA templates." }, { status: 500 });
  return NextResponse.json({ templates: buildTemplateOptions(templates ?? [], versions ?? [], activeOnly) });
}
