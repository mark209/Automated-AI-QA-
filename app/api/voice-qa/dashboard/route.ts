import { getJobProgress } from "@/lib/voice-qa/job-progress";
import type { CallStatus } from "@/lib/voice-qa/processing-jobs";
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
  const { data: calls, error } = await supabase.from("calls").select("id, status, verdict, overall_score, original_filename, created_at, agents(name), processing_jobs(job_type,status,created_at,started_at)").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load dashboard data." }, { status: 500 });
  return NextResponse.json({ calls: (calls ?? []).map(({ processing_jobs, ...call }) => ({ ...call, status: getJobProgress(call.status as CallStatus, processing_jobs.find((job) => job.job_type === "TRANSCRIPTION") ?? null, processing_jobs.find((job) => job.job_type === "EVALUATION") ?? null).status })) });
}
