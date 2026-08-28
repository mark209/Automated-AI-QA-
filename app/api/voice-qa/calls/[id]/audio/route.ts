import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: call } = await supabase.from("calls").select("storage_path, organization_id").eq("id", id).maybeSingle();
  if (!call) return NextResponse.json({ error: "Call not found." }, { status: 404 });
  const { data: member } = await supabase.from("organization_members").select("user_id").eq("organization_id", call.organization_id).eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Call not found." }, { status: 404 });

  const expirySeconds = Number(process.env.VOICE_QA_SIGNED_URL_EXPIRY_SECONDS ?? 300);
  const { data, error } = await supabase.storage.from("voice-qa-recordings").createSignedUrl(call.storage_path, expirySeconds);
  if (error || !data?.signedUrl) return NextResponse.json({ error: "The recording could not be accessed." }, { status: 500 });
  return NextResponse.json({ url: data.signedUrl, expiresIn: expirySeconds });
}
