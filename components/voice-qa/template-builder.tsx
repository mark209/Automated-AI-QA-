"use client";

import { useMemo, useState } from "react";
import { Check, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { buildTemplatePayload, TemplateCriterionDraft } from "@/lib/voice-qa/template-draft";
import { validateTemplate } from "@/lib/voice-qa/template-validation";

const initialCriteria: TemplateCriterionDraft[] = [
  { id: 1, name: "Unsecured debt", description: "Confirm the customer has enough qualifying unsecured debt.", weight: 20, evaluationType: "PASS_FAIL", blocking: true, active: true, rules: ["Combined unsecured debt is at least $10,000."] },
  { id: 2, name: "Income and employment", description: "Confirm an eligible income source and monthly income.", weight: 20, evaluationType: "PASS_FAIL", blocking: true, active: true, rules: ["Monthly income is at least $1,500.", "Record whether the customer is employed or the type of income."] },
  { id: 3, name: "Payment affordability", description: "Confirm the customer can afford the expected monthly payment.", weight: 20, evaluationType: "PASS_FAIL", blocking: true, active: true, rules: ["Affordable monthly payment is between $250 and $300 inclusive."] },
  { id: 4, name: "Behind on payments", description: "Capture how many months the customer is behind on payments.", weight: 10, evaluationType: "PASS_PARTIAL_FAIL", blocking: false, active: true, rules: ["Record the number of months behind; there is no minimum."] },
  { id: 5, name: "Service disclosure", description: "Confirm the customer understands the service is not free and is not a loan.", weight: 30, evaluationType: "PASS_FAIL", blocking: true, active: true, rules: ["Customer understands the service is not free.", "Customer understands the service is not a loan."] },
];

export function TemplateBuilder({ onSaved }: { onSaved?: () => void }) {
  const [criteria, setCriteria] = useState(initialCriteria);
  const [name, setName] = useState("Debt relief qualification");
  const [description, setDescription] = useState("Qualification criteria for debt-relief calls.");
  const [passingScore, setPassingScore] = useState(80);
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const validation = useMemo(() => validateTemplate(criteria), [criteria]);

  function updateCriterion(id: number, patch: Partial<TemplateCriterionDraft>) {
    setSaved("");
    setCriteria((current) => current.map((criterion) => criterion.id === id ? { ...criterion, ...patch } : criterion));
  }

  function addCriterion() {
    setSaved("");
    setCriteria((current) => [...current, { id: Date.now(), name: "New criterion", description: "Describe the evidence the AI should look for.", weight: 0, evaluationType: "PASS_FAIL", blocking: false, active: true, rules: [""] }]);
  }

  async function saveTemplate(activate: boolean) {
    setSaving(true); setSaved(""); setError("");
    const response = await fetch("/api/voice-qa/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildTemplatePayload({ name, description, passingScore, activate, criteria })) });
    const result = await response.json().catch(() => null);
    if (!response.ok) setError(result?.error ?? "Unable to save the template.");
    else { setSaved(activate ? "Version activated" : "Draft saved"); onSaved?.(); }
    setSaving(false);
  }

  return <div className="space-y-5">
    <div className="surface rounded-xl p-5"><div className="grid gap-5 md:grid-cols-[1.4fr_2fr_180px]"><label className="space-y-2 text-sm font-medium">Template name<input value={name} onChange={(event) => setName(event.target.value)} className="focus-ring mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm font-normal outline-none" /></label><label className="space-y-2 text-sm font-medium">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} className="focus-ring mt-1 min-h-11 w-full resize-y rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm font-normal outline-none" /></label><label className="space-y-2 text-sm font-medium">Passing score<input type="number" min="0" max="100" value={passingScore} onChange={(event) => setPassingScore(Number(event.target.value))} className="focus-ring mt-1 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm font-normal outline-none" /></label></div></div>
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><div><h2 className="font-display text-xl font-semibold tracking-[-0.03em]">Qualification criteria</h2><p className="mt-1 text-sm text-muted">Each rule becomes evidence the AI checks in the transcript.</p></div><div className={`rounded-lg border px-3 py-2 text-sm font-semibold ${validation.valid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>Total weight: {validation.totalWeight}%</div></div>
    <div className="space-y-3">{criteria.map((criterion, index) => <CriterionRow key={criterion.id} criterion={criterion} index={index} onChange={(patch) => updateCriterion(criterion.id, patch)} onDelete={() => setCriteria((current) => current.filter((item) => item.id !== criterion.id))} />)}</div>
    <button className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-3 text-sm font-semibold text-blue-700 hover:border-blue-400 hover:bg-blue-50" onClick={addCriterion}><Plus size={17} /> Add criterion</button>
    {validation.errors.length > 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><p className="font-semibold">Template needs attention before activation</p><ul className="mt-1 list-disc pl-5">{validation.errors.map((message) => <li key={message}>{message}</li>)}</ul></div>}
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <div className="flex items-center justify-end gap-3"><span className="text-sm text-emerald-700">{saved}</span><button disabled={saving} className="focus-ring flex items-center gap-2 rounded-lg border border-[var(--line)] px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60" onClick={() => saveTemplate(false)}><Save size={16} /> {saving ? "Saving…" : "Save draft"}</button><button disabled={!validation.valid || saving} className="focus-ring flex items-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300" onClick={() => saveTemplate(true)}><Check size={16} /> Activate version</button></div>
  </div>;
}

function CriterionRow({ criterion, index, onChange, onDelete }: { criterion: TemplateCriterionDraft; index: number; onChange: (patch: Partial<TemplateCriterionDraft>) => void; onDelete: () => void }) {
  function updateRule(indexToUpdate: number, value: string) {
    onChange({ rules: criterion.rules.map((rule, ruleIndex) => ruleIndex === indexToUpdate ? value : rule) });
  }

  return <article className="surface rounded-xl p-4"><div className="flex gap-3"><div className="pt-2 text-slate-400" aria-hidden="true"><GripVertical size={18} /></div><div className="min-w-0 flex-1"><div className="flex flex-col gap-3 lg:flex-row lg:items-start"><div className="flex-1"><label className="sr-only" htmlFor={`criterion-${criterion.id}`}>Criterion name</label><input id={`criterion-${criterion.id}`} value={criterion.name} onChange={(event) => onChange({ name: event.target.value })} className="focus-ring w-full rounded-lg border border-transparent px-2 py-1 text-base font-semibold outline-none hover:border-[var(--line)]" /><label className="sr-only" htmlFor={`description-${criterion.id}`}>Criterion description</label><input id={`description-${criterion.id}`} value={criterion.description} onChange={(event) => onChange({ description: event.target.value })} className="focus-ring mt-1 w-full rounded-lg border border-transparent px-2 py-1 text-sm text-muted outline-none hover:border-[var(--line)]" /></div><div className="flex flex-wrap items-center gap-2"><label className="text-xs font-semibold text-muted">Weight<input aria-label={`${criterion.name} weight`} type="number" min="0" max="100" value={criterion.weight} onChange={(event) => onChange({ weight: Number(event.target.value) })} className="focus-ring ml-2 w-16 rounded-lg border border-[var(--line)] px-2 py-2 text-sm font-semibold outline-none" /></label><label className="text-xs font-semibold text-muted">Evaluation<select aria-label={`${criterion.name} evaluation type`} value={criterion.evaluationType} onChange={(event) => onChange({ evaluationType: event.target.value as TemplateCriterionDraft["evaluationType"] })} className="focus-ring ml-2 rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-sm font-semibold outline-none"><option value="PASS_FAIL">Pass / Fail</option><option value="PASS_PARTIAL_FAIL">Pass / Partial / Fail</option></select></label></div></div>
    <div className="mt-4 rounded-lg bg-slate-50 p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">AI evidence rules</p><button type="button" className="text-xs font-semibold text-blue-700" onClick={() => onChange({ rules: [...criterion.rules, ""] })}>+ Add rule</button></div><div className="mt-2 space-y-2">{criterion.rules.map((rule, ruleIndex) => <input key={`${criterion.id}-rule-${ruleIndex}`} aria-label={`${criterion.name} evidence rule ${ruleIndex + 1}`} value={rule} onChange={(event) => updateRule(ruleIndex, event.target.value)} placeholder="What should the AI verify?" className="focus-ring w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none" />)}</div></div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={criterion.blocking} onChange={(event) => onChange({ blocking: event.target.checked })} className="h-4 w-4 accent-blue-600" /> Blocking criterion</label><div className="flex items-center gap-3"><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={criterion.active} onChange={(event) => onChange({ active: event.target.checked })} className="h-4 w-4 accent-blue-600" /> Active</label><button type="button" aria-label={`Delete criterion ${index + 1}`} className="focus-ring rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={onDelete}><Trash2 size={16} /></button></div></div></div></div></article>;
}
