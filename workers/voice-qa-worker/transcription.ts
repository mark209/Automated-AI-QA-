import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { transcribeAudio } from "@/lib/openai/transcription";

export async function processNextTranscriptionJob() {
  const supabase = createSupabaseAdminClient();
  const { data: rawJob, error: claimError } = await supabase.rpc("claim_next_transcription_job").maybeSingle();
  const job = rawJob as { id: string; call_id: string } | null;
  if (claimError) throw claimError;
  if (!job || !job.id || !job.call_id) return false;

  const { data: call, error: callError } = await supabase.from("calls").select("id, storage_path, original_filename, mime_type").eq("id", job.call_id).single();
  if (callError || !call) throw callError ?? new Error("Call not found for transcription job.");

  try {
    await supabase.from("calls").update({ status: "TRANSCRIBING" }).eq("id", call.id);
    const download = await supabase.storage.from("voice-qa-recordings").download(call.storage_path);
    if (download.error) throw download.error;
    const transcript = await transcribeAudio({ buffer: new Uint8Array(await download.data.arrayBuffer()), filename: call.original_filename, mimeType: call.mime_type });

    const { data: transcriptRow, error: transcriptError } = await supabase.from("transcripts").upsert({ call_id: call.id, model: transcript.model, language: transcript.language, duration_seconds: transcript.durationSeconds, detected_speakers: new Set(transcript.segments.map((segment) => segment.speaker)).size, status: "COMPLETED", completed_at: new Date().toISOString() }, { onConflict: "call_id" }).select("id").single();
    if (transcriptError || !transcriptRow) throw transcriptError ?? new Error("Unable to save transcript.");
    await supabase.from("transcript_segments").delete().eq("transcript_id", transcriptRow.id);
    if (transcript.segments.length) await supabase.from("transcript_segments").insert(transcript.segments.map((segment, index) => ({ transcript_id: transcriptRow.id, speaker: segment.speaker, start_seconds: segment.startSeconds, end_seconds: segment.endSeconds, text: segment.text, sort_order: index })));
    await supabase.from("processing_jobs").update({ status: "COMPLETED", completed_at: new Date().toISOString(), error_code: null, error_message: null }).eq("id", job.id);
    await supabase.from("processing_jobs").upsert({ call_id: call.id, job_type: "EVALUATION", status: "QUEUED" }, { onConflict: "call_id,job_type" });
    await supabase.from("calls").update({ status: "TRANSCRIBED", duration_seconds: transcript.durationSeconds }).eq("id", call.id);
  } catch (error) {
    console.error("Voice QA transcription failed", {
      callId: call.id,
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
    });
    await supabase.from("processing_jobs").update({ status: "FAILED", error_code: "TRANSCRIPTION_FAILED", error_message: error instanceof Error ? error.message.slice(0, 500) : "Transcription failed." }).eq("id", job.id);
    await supabase.from("calls").update({ status: "TRANSCRIPTION_FAILED" }).eq("id", call.id);
    return false;
  }
  return true;
}
