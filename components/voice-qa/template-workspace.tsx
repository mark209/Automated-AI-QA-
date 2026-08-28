"use client";

import Link from "next/link";
import { useState } from "react";
import { TemplateBuilder } from "@/components/voice-qa/template-builder";
import { TemplateLibrary } from "@/components/voice-qa/template-library";

export function TemplateWorkspace() {
  const [refreshToken, setRefreshToken] = useState(0);
  return <section className="mx-auto max-w-6xl px-6 py-10"><Link href="/" className="text-sm text-blue-700">← Back to dashboard</Link><div className="mt-8"><h1 className="font-display text-3xl font-semibold tracking-[-0.04em]">QA Templates</h1><p className="mt-2 text-sm text-muted">Build repeatable, evidence-based standards for every call.</p></div><div className="mt-8 grid gap-5 xl:grid-cols-[1.6fr_1fr]"><TemplateBuilder onSaved={() => setRefreshToken((value) => value + 1)} /><TemplateLibrary refreshToken={refreshToken} /></div></section>;
}
