import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAuthApi } from "@/lib/supabase/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: existing } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing) return NextResponse.json(existing);

  const body = await request.json().catch(() => ({}));
  const organizationName = typeof body?.organizationName === "string" && body.organizationName.trim() ? body.organizationName.trim().slice(0, 120) : "My Organization";
  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase service-role configuration is missing." }, { status: 503 });
  }

  const { data: organization, error: organizationError } = await admin.from("organizations").insert({ name: organizationName }).select("id, name").single();
  if (organizationError || !organization) return NextResponse.json({ error: "Unable to create the organization." }, { status: 500 });

  const { error: memberError } = await admin.from("organization_members").insert({ organization_id: organization.id, user_id: user.id, role: "ADMIN" });
  if (memberError) {
    await admin.from("organizations").delete().eq("id", organization.id);
    return NextResponse.json({ error: "Unable to create the organization membership." }, { status: 500 });
  }

  return NextResponse.json({ organization_id: organization.id, role: "ADMIN" }, { status: 201 });
}
