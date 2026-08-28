# Voice QA Core Flow and UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current Voice QA foundation into a usable, evidence-based MVP that guides a non-technical QA user from workspace setup through upload, transcription, AI evaluation, qualification, review, history, and dashboard results.

**Architecture:** Keep Next.js server/API routes, Supabase Auth/Postgres/Storage, and the existing TypeScript worker. Add a second asynchronous evaluation stage after transcription, keep qualification and score calculations deterministic in shared library code, and expose organization-scoped data through server routes with RLS-backed access. Replace technical identifiers in the UI with server-loaded selectors and use one authenticated application shell for all product pages.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Supabase Auth/Postgres/Storage/RLS, OpenAI SDK, Zod, Vitest.

**Spec:** `C:\Users\Hp\.codex\attachments\59be2599-34b1-4ded-a03f-0c2b270b8d08\pasted-text.txt`

## Global Constraints

- Evaluate only organization-defined QA criteria; do not let the AI invent requirements.
- The backend, not the AI, calculates authoritative scores and final verdicts.
- Keep audio storage private and never expose service-role credentials to the browser.
- Every protected operation must verify authentication, organization membership, role, and resource ownership.
- Preserve historical template versions and evaluation results.
- Validate structured AI output before persistence.
- Treat recordings, transcripts, evidence, and customer references as sensitive data.
- Do not expose raw provider errors as the primary user-facing message.
- Do not add dependencies unless the existing stack cannot provide the required behavior.

---

### Task 1: Establish a reliable local/runtime baseline

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Create: `tests/runtime-config.test.ts`
- Inspect and, if dependency repair is required, update: `package-lock.json`

**Interfaces:**
- Produces a documented local command that serves the app on the expected port and a worker command that loads `.env.local`.

- [ ] **Step 1: Write the failing test**

Add a test that asserts the documented scripts exist and that required environment names are present in `.env.example`.

- [ ] **Step 2: Run the test to verify it fails**

Run `npm test -- tests/runtime-config.test.ts`. Confirm the failure identifies the missing or inconsistent runtime contract.

- [ ] **Step 3: Implement the minimal runtime correction**

Repair the Next.js native runtime dependency or lockfile using the project’s existing package manager, ensure `dev` and `worker` scripts use the documented configuration, and document the expected local URL and port-conflict behavior. Do not add a second server architecture.

- [ ] **Step 4: Run the test to verify it passes**

Run `npm test -- tests/runtime-config.test.ts`, then start the app and worker separately and verify the expected port responds without a framework error page.

- [ ] **Step 5: Commit**

Run `git add package.json package-lock.json README.md tests/runtime-config.test.ts` and `git commit -m "chore: stabilize local voice qa runtime"`.

### Task 2: Make authentication and organization onboarding explicit

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/api/auth/bootstrap/route.ts`
- Modify: `middleware.ts`
- Modify: `components/voice-qa/auth-user-menu.tsx`
- Create: `app/onboarding/page.tsx`
- Create: `app/api/auth/invitations/route.ts`
- Create: `tests/onboarding-flow.test.ts`

**Interfaces:**
- `POST /api/auth/bootstrap` returns `{ organization_id, role }` only for a deliberate workspace-creation path.
- Authenticated users without membership receive an explicit onboarding or pending-access state.
- Login honors the `next` query parameter after successful sign-in.

- [ ] **Step 1: Write failing tests**

Cover: redirecting back to `next`, showing a workspace-choice state for a signed-in user without membership, and preventing upload access without membership.

- [ ] **Step 2: Run tests and verify the intended failures**

Run `npm test -- tests/onboarding-flow.test.ts` and confirm the tests fail because the current login flow always targets the dashboard and signup does not distinguish create versus join.

- [ ] **Step 3: Implement onboarding**

Add explicit “Create workspace” and “Join workspace” paths, a pending-membership state, and consistent name/email/role display. Ensure organization creation remains server-side and does not use editable user metadata for authorization.

- [ ] **Step 4: Run tests and manually verify**

Run the focused test, then verify sign-in, sign-out, invalid credentials, session expiry, first-workspace creation, and a user without membership in the browser.

- [ ] **Step 5: Commit**

Run `git add app/login app/onboarding app/api/auth middleware.ts components/voice-qa/auth-user-menu.tsx tests/onboarding-flow.test.ts` and `git commit -m "feat: add explicit workspace onboarding"`.

### Task 3: Build usable template and call setup workflows

**Files:**
- Modify: `components/voice-qa/dashboard-shell.tsx`
- Modify: `components/voice-qa/template-builder.tsx`
- Modify: `app/voice-qa/templates/page.tsx`
- Modify: `app/voice-qa/analyze/page.tsx`
- Modify: `app/api/voice-qa/templates/route.ts`
- Modify: `app/api/voice-qa/calls/route.ts`
- Create: `app/api/voice-qa/agents/route.ts`
- Create: `app/api/voice-qa/templates/list/route.ts`
- Create: `tests/setup-workflow.test.ts`

**Interfaces:**
- `GET /api/voice-qa/agents` returns organization-scoped selectable agents.
- `GET /api/voice-qa/templates/list` returns active template versions with display names and version numbers.
- Template criteria support editable rules, weights, evaluation type, active status, blocking status, and sort order.
- Upload accepts selected agent/template IDs but never asks the user to paste UUIDs.

- [ ] **Step 1: Write failing tests**

Test that template rules are included in the payload, activation rejects active weights other than 100%, upload metadata is organization-scoped, and selectors are populated from API data rather than raw text inputs.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm test -- tests/setup-workflow.test.ts` and confirm the current builder cannot create rules and the upload page has raw UUID inputs.

- [ ] **Step 3: Implement template management**

Add template list/create/edit/version views, expandable criterion rules, draft-saving feedback, unsaved-change messaging, activation controls, and clear version labels. Keep the existing schema and add only the route behavior needed to query and persist it safely.

- [ ] **Step 4: Implement upload setup UX**

Add searchable agent and template selectors, call-detail fields that are optional, real drag-and-drop behavior, visible “Choose file” control, file validation feedback, and a step indicator: Select setup → Upload → Start analysis.

- [ ] **Step 5: Run tests and browser verification**

Run the focused tests and manually verify template creation, rule editing, invalid weight handling, selector loading, M4A/MP3/WAV validation, upload success, upload failure, and retryable states.

- [ ] **Step 6: Commit**

Run `git add components app/voice-qa app/api/voice-qa tests/setup-workflow.test.ts` and `git commit -m "feat: add usable template and upload setup"`.

### Task 4: Add asynchronous AI evaluation and qualification processing

**Files:**
- Modify: `supabase/migrations/0002_qualification_results.sql`
- Create: `supabase/migrations/0003_evaluation_pipeline.sql`
- Modify: `workers/voice-qa-worker/index.ts`
- Modify: `workers/voice-qa-worker/transcription.ts`
- Create: `workers/voice-qa-worker/evaluation.ts`
- Create: `lib/openai/evaluation.ts`
- Create: `lib/voice-qa/evaluation-schema.ts`
- Create: `lib/voice-qa/scoring.ts`
- Create: `tests/evaluation-pipeline.test.ts`
- Create: `tests/scoring.test.ts`

**Interfaces:**
- `evaluateTranscript(input)` returns schema-validated criterion results with status, confidence, reason, and timestamped evidence.
- `calculateScore(criteria, evaluationResults, passingScore)` returns `{ score, verdict }` without consulting the model for the final result.
- Worker transitions calls through `TRANSCRIBED → ANALYZING → COMPLETED` or an explicit failure state.
- Worker creates one evaluation job per call/template version and safely retries failed jobs.

- [ ] **Step 1: Write failing tests**

Cover valid structured model output, malformed output rejection, missing evidence producing `NEEDS_REVIEW`, partial scoring, blocking criteria, passing threshold, qualification thresholds, and idempotent retry behavior.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm test -- tests/evaluation-pipeline.test.ts tests/scoring.test.ts` and confirm the evaluation and scoring modules do not yet exist.

- [ ] **Step 3: Implement schema and prompt boundary**

Create Zod schemas for model output and isolate prompt construction from the worker. Send only the transcript and selected template criteria/rules. Convert malformed or ambiguous responses into controlled failures or `NEEDS_REVIEW`.

- [ ] **Step 4: Implement deterministic scoring and qualification**

Calculate criterion scores, weighted total, blocking-rule verdicts, and debt-relief qualification status in TypeScript. Store original AI results separately from future human overrides.

- [ ] **Step 5: Implement worker evaluation stage**

After successful transcription, enqueue or claim an evaluation job, persist evaluation results and evidence, update call status, and store safe error codes. Do not log raw audio, transcript, or provider payloads.

- [ ] **Step 6: Run tests and verify against mocked OpenAI**

Run all focused tests plus the existing test suite. Use mocked OpenAI responses for success, malformed output, timeout, and quota failure.

- [ ] **Step 7: Commit**

Run `git add supabase/migrations workers lib/openai lib/voice-qa tests` and `git commit -m "feat: add evidence based evaluation pipeline"`.

### Task 5: Redesign call review around verdicts and evidence

**Files:**
- Modify: `app/voice-qa/calls/[id]/page.tsx`
- Modify: `app/api/voice-qa/calls/[id]/transcript/route.ts`
- Modify: `components/voice-qa/processing-status.tsx`
- Modify: `components/voice-qa/qualification-summary.tsx`
- Modify: `components/voice-qa/transcript-viewer.tsx`
- Create: `components/voice-qa/audio-player.tsx`
- Create: `components/voice-qa/evaluation-summary.tsx`
- Create: `components/voice-qa/evidence-panel.tsx`
- Create: `tests/call-review.test.tsx`

**Interfaces:**
- Call review response includes call metadata, status, job state, transcript, evaluation summary, qualification result, and short-lived signed audio URL.
- Evidence selection calls `onSeek(seconds)` and the audio player seeks and plays at that timestamp.

- [ ] **Step 1: Write failing tests**

Test verdict rendering, criterion details, evidence highlighting, loading/error/retry states, and timestamp seeking without requiring a live OpenAI call.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm test -- tests/call-review.test.tsx` and confirm the current page has no audio player or evaluation summary.

- [ ] **Step 3: Implement review information hierarchy**

Add header verdict/score, metadata, evaluation summary, qualification summary, transcript, evidence details, and activity/status sections. Replace raw provider errors with safe user-facing messages while retaining an internal error code.

- [ ] **Step 4: Implement audio evidence playback**

Generate a short-lived signed URL server-side and connect transcript/evidence buttons to the audio player. Include keyboard-accessible controls and a visible current timestamp.

- [ ] **Step 5: Run tests and browser verification**

Run focused and full tests. Verify completed, processing, failed, no-transcript, no-evidence, and `NEEDS_REVIEW` states in the browser.

- [ ] **Step 6: Commit**

Run `git add app/voice-qa/calls components/voice-qa app/api/voice-qa/calls tests/call-review.test.tsx` and `git commit -m "feat: build evidence first call review"`.

### Task 6: Connect Call History and real dashboard analytics

**Files:**
- Modify: `app/voice-qa/calls/page.tsx`
- Modify: `components/voice-qa/dashboard-shell.tsx`
- Create: `app/api/voice-qa/dashboard/route.ts`
- Create: `app/api/voice-qa/calls/list/route.ts`
- Create: `components/voice-qa/call-history-table.tsx`
- Create: `components/voice-qa/dashboard-metrics.tsx`
- Create: `tests/dashboard-history.test.ts`

**Interfaces:**
- `GET /api/voice-qa/calls/list` supports organization-scoped server-side pagination and filters.
- `GET /api/voice-qa/dashboard` returns KPI values and aggregated chart data from database queries.

- [ ] **Step 1: Write failing tests**

Test pagination, status/verdict/date filters, organization isolation, empty states, and dashboard aggregation semantics.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm test -- tests/dashboard-history.test.ts` and confirm the current routes have no data queries.

- [ ] **Step 3: Implement server-side query routes**

Add bounded queries, stable ordering, indexes aligned to filters, and RLS/organization checks. Do not load all calls or transcripts into the browser.

- [ ] **Step 4: Implement history and dashboard UI**

Add a call table, filters, pagination, real KPI cards, score distribution, trend, top failures, recent activity, and clear loading/empty/error states. Use current date ranges and make controls functional.

- [ ] **Step 5: Run tests and browser verification**

Run focused and full tests. Verify no-data, processing-only, completed-evaluation, mixed-status, and failed-call states.

- [ ] **Step 6: Commit**

Run `git add app/voice-qa/calls app/api/voice-qa components/voice-qa tests/dashboard-history.test.ts` and `git commit -m "feat: connect call history and dashboard analytics"`.

### Task 7: Apply cross-product UX, accessibility, and security hardening

**Files:**
- Modify: `components/voice-qa/dashboard-shell.tsx`
- Modify: `components/voice-qa/foundation-placeholder.tsx`
- Modify: `app/voice-qa/agents/page.tsx`
- Modify: `app/voice-qa/reports/page.tsx`
- Modify: `app/settings/organization/page.tsx`
- Modify: `app/settings/users/page.tsx`
- Modify: `app/settings/ai-configuration/page.tsx`
- Modify: `app/globals.css`
- Modify: `README.md`
- Create: `tests/accessibility-smoke.test.tsx`

**Interfaces:**
- All authenticated product pages use consistent navigation, active-route state, responsive layout, and user-oriented copy.
- Future modules are either functional or clearly marked as unavailable without implying completed capabilities.

- [ ] **Step 1: Write failing tests**

Test navigation links, active route semantics, accessible labels/focus states, safe error copy, and responsive layout contracts.

- [ ] **Step 2: Run focused tests and verify failure**

Run `npm test -- tests/accessibility-smoke.test.tsx` and record current failures for inert buttons, inconsistent shells, and placeholder copy.

- [ ] **Step 3: Implement the smallest consistent UI pass**

Use one shell, remove or mark inactive modules, make help/notifications/filter controls either functional or hidden, fix overflow at common laptop/tablet widths, and replace developer-facing copy with user-oriented recovery guidance.

- [ ] **Step 4: Run full verification**

Run `npm test`, `npm run build`, a desktop browser pass, and a mobile-sized browser pass. Check console errors, keyboard focus, contrast, overflow, and all major processing states.

- [ ] **Step 5: Commit**

Run `git add app components lib tests README.md` and `git commit -m "fix: harden voice qa product experience"`.

## Coverage Review

This plan covers the MVP definition of done for authentication, organization context, template configuration, MP3/WAV/M4A upload, asynchronous transcription, speaker-aware transcripts, AI criterion evaluation, structured validation, deterministic scoring, blocking rules, qualification outcomes, call review, evidence playback, history, dashboard metrics, error handling, retries, responsive UX, accessibility, and RLS-aware organization isolation.

The following remain intentionally outside the first implementation pass: bulk upload, live call monitoring, AI coaching, emotion recognition, predictive analytics, billing, public multi-tenant signup, complex notifications, and advanced human override analytics.
