# Voice QA

Voice QA is an evidence-based voice quality assurance platform. The current foundation establishes the Next.js application shell, organization-aware Supabase schema, private storage buckets, and dashboard navigation.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add Supabase project values.
3. Apply `supabase/migrations/0001_voice_qa_foundation.sql` to the project.
4. Install dependencies with `npm install`.
5. Run `npm run dev` to serve the app at `http://localhost:3000`.
6. Run `npm run worker` in a second terminal after `.env.local` exists.

If port 3000 is busy, stop the conflicting process before restarting the app.
The worker reads `.env.local` directly through the documented script so it can use the same local secrets as the app shell.

The dashboard intentionally displays empty states until Supabase data is connected. It does not display invented QA metrics.

## Runtime commands

- `npm run dev` — starts the Next.js app on port 3000.
- `npm run worker` — starts the Voice QA worker with `.env.local` loaded.

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

Phase 1 foundation, QA template persistence, audio upload, and asynchronous transcription foundations are implemented. The worker uses `gpt-4o-transcribe-diarize` by default for speaker-labeled segments and keeps the model configurable through `OPENAI_TRANSCRIPTION_MODEL`.

Run `npm run worker` in a separate process after applying the Supabase migration and configuring service-role/OpenAI environment variables.
