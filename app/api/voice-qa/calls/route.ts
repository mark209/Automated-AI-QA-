import { getJobProgress } from "@/lib/voice-qa/job-progress";
import type { CallStatus } from "@/lib/voice-qa/processing-jobs";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthApi } from "@/lib/supabase/auth-api";
import { getMaxAudioSizeBytes, validateAudioBuffer } from "@/lib/voice-qa/audio-validation";
import { templateBelongsToOrganization } from "@/lib/voice-qa/template-validation";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).in("role", ["ADMIN", "QA_SUPERVISOR", "QA_ANALYST"]).limit(1).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to verify organization membership." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "You do not have permission to upload calls." }, { status: 403 });

  const maxAudioSizeBytes = getMaxAudioSizeBytes();
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxAudioSizeBytes + 1024 * 1024) {
    return NextResponse.json({ error: `Audio files must be ${Math.floor(maxAudioSizeBytes / (1024 * 1024))} MB or smaller.` }, { status: 413 });
  }
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an audio recording to upload." }, { status: 400 });
  if (file.size > maxAudioSizeBytes) return NextResponse.json({ error: `Audio files must be ${Math.floor(maxAudioSizeBytes / (1024 * 1024))} MB or smaller.` }, { status: 413 });
  const agentId = textValue(formData?.get("agentId"));
  const templateVersionId = textValue(formData?.get("templateVersionId"));
  if (!templateVersionId) return NextResponse.json({ error: "Choose a QA template before uploading so the call can be evaluated." }, { status: 400 });
  if (agentId) {
    const { data: agent, error: agentError } = await supabase.from("agents").select("id").eq("id", agentId).eq("organization_id", membership.organization_id).maybeSingle();
    if (agentError) return NextResponse.json({ error: "Unable to verify the selected agent." }, { status: 500 });
    if (!agent) return NextResponse.json({ error: "The selected agent does not belong to your organization." }, { status: 400 });
  }
  if (templateVersionId) {
    const { data: version, error: versionError } = await supabase.from("qa_template_versions").select("id, template_id").eq("id", templateVersionId).maybeSingle();
    if (versionError) return NextResponse.json({ error: "Unable to verify the selected QA template." }, { status: 500 });
    if (!version) return NextResponse.json({ error: "The selected QA template could not be found." }, { status: 400 });
    const { data: template, error: templateError } = await supabase.from("qa_templates").select("id, organization_id").eq("id", version.template_id).maybeSingle();
    if (templateError) return NextResponse.json({ error: "Unable to verify the selected QA template." }, { status: 500 });
    if (!templateBelongsToOrganization(template?.organization_id, membership.organization_id)) return NextResponse.json({ error: "The selected QA template does not belong to your organization." }, { status: 400 });
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const validation = validateAudioBuffer({ filename: file.name, mimeType: file.type, size: file.size, bytes: buffer, maxSizeBytes: maxAudioSizeBytes });
  if (!validation.valid || !validation.detectedType) return NextResponse.json({ error: validation.error ?? "The audio file could not be validated." }, { status: 400 });

  const callId = crypto.randomUUID();
  const storagePath = `${membership.organization_id}/${callId}/${safeFilename(file.name)}`;
  const upload = await supabase.storage.from("voice-qa-recordings").upload(storagePath, new Blob([buffer], { type: validation.detectedType }), { contentType: validation.detectedType, upsert: false });
  if (upload.error) return NextResponse.json({ error: "The recording could not be uploaded." }, { status: 500 });

  const { data: call, error: callError } = await supabase.from("calls").insert({ id: callId, organization_id: membership.organization_id, agent_id: agentId, template_version_id: templateVersionId, original_filename: file.name, storage_path: storagePath, mime_type: validation.detectedType, file_size: file.size, status: "UPLOADED", uploaded_by: user.id }).select("id, status").single();
  if (callError || !call) {
    await supabase.storage.from("voice-qa-recordings").remove([storagePath]);
    return NextResponse.json({ error: "The recording was uploaded but could not be registered." }, { status: 500 });
  }

  return NextResponse.json(call, { status: 201 });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await getAuthApi(supabase).getUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { data: membership, error: membershipError } = await supabase.from("organization_members").select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (membershipError) return NextResponse.json({ error: "Unable to load organization data." }, { status: 500 });
  if (!membership) return NextResponse.json({ error: "Organization setup is required." }, { status: 403 });
  const { data: calls, error } = await supabase.from("calls").select("id, status, verdict, overall_score, original_filename, created_at, duration_seconds, agents(name), processing_jobs(job_type,status,created_at,started_at)").eq("organization_id", membership.organization_id).order("created_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "Unable to load call history." }, { status: 500 });
  return NextResponse.json({ calls: (calls ?? []).map(({ processing_jobs, ...call }) => ({ ...call, status: getJobProgress(call.status as CallStatus, processing_jobs.find((job) => job.job_type === "TRANSCRIPTION") ?? null, processing_jobs.find((job) => job.job_type === "EVALUATION") ?? null).status })) });
}

function textValue(value: FormDataEntryValue | null | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function safeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-180);
}
