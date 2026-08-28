import { CheckCircle2, CircleAlert, CircleX, Info } from "lucide-react";
import type { QualificationCriterionResult, QualificationStatus } from "@/lib/voice-qa/qualification";

const statusCopy: Record<QualificationStatus, string> = {
  QUALIFIED: "Qualified",
  NOT_QUALIFIED: "Not qualified",
  NEEDS_REVIEW: "Needs review",
};

function evidenceLabel(evidence: unknown) {
  if (!evidence || typeof evidence !== "object" || !("quote" in evidence)) return "Transcript evidence attached";
  return String(evidence.quote ?? "Transcript evidence attached");
}

export function QualificationSummary({ status, rulesVersion, criteria }: { status: QualificationStatus; rulesVersion: string; criteria: QualificationCriterionResult[] }) {
  const Icon = status === "QUALIFIED" ? CheckCircle2 : status === "NOT_QUALIFIED" ? CircleX : CircleAlert;
  const colors = status === "QUALIFIED" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : status === "NOT_QUALIFIED" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800";

  return <section className="surface rounded-xl p-5"><div className={`flex items-center gap-3 rounded-lg border p-4 ${colors}`} role="status"><Icon size={20} /><div><p className="font-semibold">Qualification: {statusCopy[status]}</p><p className="mt-1 text-xs opacity-80">Rules version: {rulesVersion}</p></div></div><div className="mt-5 divide-y divide-[var(--line)]">{criteria.map((criterion) => <div key={criterion.key} className="flex items-start justify-between gap-4 py-3"><div><p className="text-sm font-semibold text-slate-800">{criterion.label}{!criterion.required && <span className="ml-2 text-xs font-normal text-muted">Informational</span>}</p><p className="mt-1 text-xs text-muted">{criterion.reason}</p>{criterion.evidence != null && <p className="mt-2 text-xs text-slate-600">Evidence: {evidenceLabel(criterion.evidence)}</p>}</div><span className="flex shrink-0 items-center gap-1 text-xs font-semibold"><Info size={13} /> {criterion.outcome.replaceAll("_", " ")}</span></div>)}</div></section>;
}
