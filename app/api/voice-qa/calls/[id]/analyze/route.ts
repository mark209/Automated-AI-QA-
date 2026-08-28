import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: call } = await supabase.from("calls").select("id, organization_id, status").eq("id", id).maybeSingle();
  if (!call) return NextResponse.json({ error: "Call not found." }, { status: 404 });
  const { data: membership } = await supabase.from("organization_members").select("role").eq("organization_id", call.organization_id).eq("user_id", user.id).in("role", ["ADMIN", "QA_SUPERVISOR", "QA_ANALYST"]).maybeSingle();
  if (!membership) return NextResponse.json({ error: "You do not have permission to analyze this call." }, { status: 403 });

  const [{ data: existing }, { data: evaluationJob }] = await Promise.all([
    supabase.from("processing_jobs").select("id, status, attempts").eq("call_id", id).eq("job_type", "TRANSCRIPTION").maybeSingle(),
    supabase.from("processing_jobs").select("id, status, attempts").eq("call_id", id).eq("job_type", "EVALUATION").maybeSingle(),
  ]);
  if (existing?.status === "COMPLETED" && evaluationJob?.status === "FAILED") {
    const { data: job } = await supabase.from("processing_jobs").update({ status: "QUEUED", error_code: null, error_message: null }).eq("id", evaluationJob.id).select("id, status, attempts").single();
    if (!job) return NextResponse.json({ error: "Unable to retry evaluation." }, { status: 500 });
    await supabase.from("calls").update({ status: "TRANSCRIBED" }).eq("id", id);
    return NextResponse.json(job, { status: 202 });
  }
  if (existing?.status === "PROCESSING" || existing?.status === "COMPLETED") return NextResponse.json(existing, { status: 202 });

  let job;
  if (existing?.status === "FAILED") {
    const result = await supabase.from("processing_jobs").update({ status: "QUEUED", error_code: null, error_message: null }).eq("id", existing.id).select("id, status, attempts").single();
    job = result.data;
  } else {
    const result = await supabase.from("processing_jobs").insert({ call_id: id, job_type: "TRANSCRIPTION", status: "QUEUED" }).select("id, status, attempts").single();
    job = result.data;
  }
  if (!job) return NextResponse.json({ error: "Unable to queue transcription." }, { status: 500 });
  await supabase.from("calls").update({ status: "QUEUED" }).eq("id", id);
  return NextResponse.json(job, { status: 202 });
}
