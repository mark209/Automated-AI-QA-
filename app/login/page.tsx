"use client";

import { FormEvent, useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getAuthApi } from "@/lib/supabase/auth-api";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setMessage("Enter a valid email address.");
      setSubmitting(false);
      return;
    }
    const auth = getAuthApi(supabase);
    const result = mode === "signin"
      ? await auth.signInWithPassword({ email: normalizedEmail, password })
      : await auth.signUp({ email: normalizedEmail, password, options: { data: { display_name: name.trim() } } });

    if (result.error) {
      setMessage(result.error.message);
      setSubmitting(false);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      setMessage("Account created. Check your email to confirm the account, then sign in.");
      setSubmitting(false);
      return;
    }

    const bootstrap = await fetch("/api/auth/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ organizationName: name.trim() ? `${name.trim()} Organization` : "My Organization" }) });
    const bootstrapResult = await bootstrap.json().catch(() => null);
    if (!bootstrap.ok) {
      setMessage(bootstrapResult?.error ?? "Your account is signed in, but organization setup failed.");
      setSubmitting(false);
      return;
    }
    window.location.assign("/");
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12"><div className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(145,28,57,0.16)] blur-3xl" aria-hidden="true" /><section className="surface relative w-full max-w-md rounded-2xl p-8"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-[0_0_24px_rgba(214,83,104,0.3)]"><ShieldCheck size={21} /></div><div><p className="font-display text-xl font-semibold tracking-[-0.04em]">QA AI Automation</p><p className="text-xs text-muted">Call quality assurance powered by ARC AI Engine</p></div></div><h1 className="mt-8 font-display text-2xl font-semibold tracking-[-0.04em]">{mode === "signin" ? "Welcome back" : "Create your workspace"}</h1><p className="mt-2 text-sm text-muted">{mode === "signin" ? "Sign in to review and analyze calls." : "Create the first admin account for this workspace."}</p><form className="mt-7 space-y-4" onSubmit={submit}>{mode === "signup" && <label className="block text-sm font-medium">Your name<input required value={name} onChange={(event) => setName(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal outline-none" /></label>}<label className="block text-sm font-medium">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal outline-none" /></label><label className="block text-sm font-medium">Password<input required minLength={6} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="focus-ring mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2.5 font-normal outline-none" /></label>{message && <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{message}</div>}<button disabled={submitting} className="focus-ring flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--blue)] px-4 py-3 text-sm font-semibold text-white shadow-[0_0_22px_rgba(214,83,104,0.18)] disabled:opacity-60">{submitting ? <Loader2 className="animate-spin" size={17} /> : <LockKeyhole size={17} />}{mode === "signin" ? "Sign in" : "Create account"}</button></form><button className="mt-5 w-full text-sm font-medium text-blue-700 hover:underline" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setMessage(""); }}>{mode === "signin" ? "Create a new account" : "I already have an account"}</button></section></main>;
}
