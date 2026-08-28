# Voice QA

Voice QA is an evidence-based voice quality assurance platform. The current baseline includes a Next.js app shell, the login experience, foundation dashboard routes, and a polling transcription worker wired to the local environment file.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add Supabase project values.
3. Apply `supabase/migrations/0001_voice_qa_foundation.sql` to the project.
4. Install dependencies with `npm install`.
5. Run `npm run dev` to serve the app at `http://localhost:3000`.
6. Run `npm run worker` in a second terminal after `.env.local` exists.

Because the dev script is pinned to port 3000, `npm run dev` fails with `EADDRINUSE` if that port is already busy. Stop the conflicting process, then rerun the command on port 3000.
The worker reads `.env.local` directly through the documented script so it can use the same local secrets as the app shell.

The verified baseline serves the login page and foundation shell without a Next.js framework error page. Dashboard surfaces still show empty states until Supabase data is connected; they do not display invented QA metrics.

## Runtime commands

- `npm run dev` - starts the Next.js app on port 3000.
- `npm run worker` - starts the Voice QA worker with `.env.local` loaded.
- `npm test -- tests/runtime-config.test.ts` - checks the documented scripts and required environment names.
- `npm test -- tests/runtime-smoke.test.ts` - starts Next on an ephemeral port, probes the login page, and shuts the child process down again.

## Environment

Copy `.env.example` to `.env.local` and provide the following values before running the app or worker:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_EVALUATION_MODEL`
- `VOICE_QA_WORKER_POLL_INTERVAL_MS`
- `VOICE_QA_MAX_AUDIO_SIZE_MB`
- `VOICE_QA_SIGNED_URL_EXPIRY_SECONDS`

## Current phase

Phase 1 foundation work is in place. The app boots into the login flow and foundation routes, while the worker polls for transcription jobs using the models configured in `.env.local`.

Run `npm run worker` in a separate process after applying the Supabase migration and configuring service-role/OpenAI environment variables.
