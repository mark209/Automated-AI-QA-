import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { evaluateTranscript, type EvaluationCriterion } from "@/lib/openai/evaluation";

export async function processNextEvaluationJob() {
  const supabase = createSupabaseAdminClient();
  const { data: rawJob, error: claimError } = await supabase.rpc("claim_next_evaluation_job").maybeSingle();
  const job = rawJob as { id: string; call_id: string } | null;
  if (claimError) throw claimError;
  if (!job || !job.id || !job.call_id) return false;

  try {
    const { error: analyzingStatusError } = await supabase.from("calls").update({ status: "ANALYZING" }).eq("id", job.call_id);
    if (analyzingStatusError) throw analyzingStatusError;
    const { data: call, error: callError } = await supabase.from("calls").select("id, template_version_id").eq("id", job.call_id).single();
    if (callError) throw callError;
    if (!call?.template_version_id) throw new Error("A QA template must be selected before evaluation.");
    const { data: version, error: versionError } = await supabase.from("qa_template_versions").select("id, version_number, template_id").eq("id", call.template_version_id).single();
    if (versionError || !version) throw versionError ?? new Error("QA template version not found.");
    const [{ data: template, error: templateError }, { data: criteriaRows, error: criteriaLoadError }] = await Promise.all([
      supabase.from("qa_templates").select("passing_score").eq("id", version.template_id).single(),
      supabase.from("qa_criteria").select("id, name, description, weight, evaluation_type, blocking, sort_order").eq("template_version_id", version.id).eq("active", true).order("sort_order"),
    ]);
    if (templateError || !template) throw templateError ?? new Error("QA template not found.");
    if (criteriaLoadError || !criteriaRows?.length) throw criteriaLoadError ?? new Error("QA template has no active criteria.");
    const { data: rules, error: rulesError } = await supabase.from("qa_criterion_rules").select("criterion_id, rule_text, sort_order").in("criterion_id", criteriaRows.map((criterion) => criterion.id)).order("sort_order");
    if (rulesError) throw rulesError;
    const rulesByCriterion = new Map<string, string[]>();
    for (const rule of rules ?? []) rulesByCriterion.set(rule.criterion_id, [...(rulesByCriterion.get(rule.criterion_id) ?? []), rule.rule_text]);
    const criteria: EvaluationCriterion[] = criteriaRows.map((criterion) => ({ id: criterion.id, name: criterion.name, description: criterion.description, rules: rulesByCriterion.get(criterion.id) ?? [], weight: Number(criterion.weight), evaluationType: criterion.evaluation_type, blocking: criterion.blocking, sortOrder: criterion.sort_order }));
    const { data: transcript, error: transcriptError } = await supabase.from("transcripts").select("id").eq("call_id", job.call_id).maybeSingle();
    if (transcriptError) throw transcriptError;
    if (!transcript) throw new Error("Transcript is not available for evaluation.");
    const { data: segments, error: segmentError } = await supabase.from("transcript_segments").select("speaker, start_seconds, end_seconds, text, sort_order").eq("transcript_id", transcript.id).order("sort_order");
    if (segmentError) throw segmentError;

    const evaluation = await evaluateTranscript((segments ?? []).map((segment) => ({ speaker: segment.speaker, startSeconds: Number(segment.start_seconds), endSeconds: Number(segment.end_seconds), text: segment.text })), criteria, Number(template.passing_score), `template-v${version.version_number}`);
    const { data: evaluationRow, error: evaluationError } = await supabase.from("qualification_evaluations").upsert({ call_id: job.call_id, rules_version: evaluation.result.rulesVersion, status: evaluation.result.status, input: evaluation.input, updated_at: new Date().toISOString() }, { onConflict: "call_id" }).select("id").single();
    if (evaluationError || !evaluationRow) throw evaluationError ?? new Error("Unable to save qualification evaluation.");
    const { error: deleteCriteriaError } = await supabase.from("qualification_criteria_results").delete().eq("evaluation_id", evaluationRow.id);
    if (deleteCriteriaError) throw deleteCriteriaError;
    const { error: criteriaError } = await supabase.from("qualification_criteria_results").insert(evaluation.result.criteria.map((criterion, index) => ({ evaluation_id: evaluationRow.id, criterion_key: criterion.key, label: criterion.label, required: criterion.required, outcome: criterion.outcome, value: criterion.value, reason: criterion.reason, evidence: criterion.evidence ?? null, sort_order: index })));
    if (criteriaError) throw criteriaError;

    const { error: completeJobError } = await supabase.from("processing_jobs").update({ status: "COMPLETED", completed_at: new Date().toISOString(), error_code: null, error_message: null }).eq("id", job.id);
    if (completeJobError) throw completeJobError;
    const { error: completedStatusError } = await supabase.from("calls").update({ status: "COMPLETED", verdict: evaluation.result.status, overall_score: evaluation.result.overallScore }).eq("id", job.call_id);
    if (completedStatusError) throw completedStatusError;
    return true;
  } catch (error) {
    console.error("ARC AI Engine evaluation failed", { callId: job.call_id, jobId: job.id, error: error instanceof Error ? error.message : "Unknown evaluation error." });
    await supabase.from("processing_jobs").update({ status: "FAILED", error_code: "EVALUATION_FAILED", error_message: "Evaluation failed. Check worker logs, then retry." }).eq("id", job.id);
    await supabase.from("calls").update({ status: "ANALYSIS_FAILED" }).eq("id", job.call_id);
    return false;
  }
}
