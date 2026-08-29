import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { canDeleteRecording } from "@/lib/voice-qa/call-list";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: call } = await supabase.from("calls").select("id, organization_id, original_filename, status, duration_seconds, created_at").eq("id", id).maybeSingle();
  if (!call) return NextResponse.json({ error: "Call not found." }, { status: 404 });
  const { data: member } = await supabase.from("organization_members").select("user_id").eq("organization_id", call.organization_id).eq("user_id", user.id).maybeSingle();
  if (!member) return NextResponse.json({ error: "Call not found." }, { status: 404 });

  const [{ data: job }, { data: transcript }] = await Promise.all([
    supabase.from("processing_jobs").select("id, job_type, status, attempts, error_code, created_at, completed_at").eq("call_id", id).eq("job_type", "TRANSCRIPTION").maybeSingle(),
    supabase.from("transcripts").select("id, model, language, status, duration_seconds, detected_speakers, completed_at, transcript_segments(id, speaker, start_seconds, end_seconds, text, sort_order)").eq("call_id", id).maybeSingle(),
  ]);
  return NextResponse.json({ call, job, transcript });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: call } = await supabase.from("calls").select("id, organization_id, storage_path").eq("id", id).maybeSingle();
  if (!call) return NextResponse.json({ error: "Call not found." }, { status: 404 });
  const { data: membership } = await supabase.from("organization_members").select("role").eq("organization_id", call.organization_id).eq("user_id", user.id).maybeSingle();
  if (!membership || !canDeleteRecording(membership.role)) return NextResponse.json({ error: "You do not have permission to delete this recording." }, { status: 403 });

  const admin = createSupabaseAdminClient();
  const { error: storageError } = await admin.storage.from("voice-qa-recordings").remove([call.storage_path]);
  if (storageError) return NextResponse.json({ error: "The recording could not be deleted from storage." }, { status: 500 });
  const { error: deleteError } = await admin.from("calls").delete().eq("id", id).eq("organization_id", call.organization_id);
  if (deleteError) return NextResponse.json({ error: "The recording file was removed, but its database record could not be deleted." }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
