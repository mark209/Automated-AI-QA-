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
  const { data: calls, error } = await supabase.from("calls").select("id, status, verdict, overall_score, original_filename, created_at, agents(name)").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load dashboard data." }, { status: 500 });
  return NextResponse.json({ calls: calls ?? [] });
}
