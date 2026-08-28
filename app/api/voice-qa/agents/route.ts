import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to load organization data." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Organization setup is required." }, { status: 403 });

  const { data: agents, error } = await supabase.from("agents").select("id, name, external_id").eq("organization_id", membership.organization_id).order("name");
  if (error) return NextResponse.json({ error: "Unable to load agents." }, { status: 500 });
  return NextResponse.json({ agents: agents ?? [] });
}
