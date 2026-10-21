# QA AI Automation

QA AI Automation is an evidence-based call quality assurance application. ARC AI Engine powers audio transcription, speaker identification, and template-based call evaluation.

## Current capabilities and limits

The application includes Supabase authentication and organization membership, organization-scoped call upload and history, QA template authoring, an asynchronous transcription and evaluation worker, transcript evidence playback, and processing status/retry handling.

Reporting/export, agent performance profiles, organization settings, user administration, configurable AI settings, and human score adjustment are not implemented. The application should be treated as an MVP until those workflows and production end-to-end verification are complete. Calls require an active QA template before upload. Evaluation requires a running worker and valid OpenAI credentials.

## Local setup

1. Copy `.env.example` to `.env.local` and set the Supabase URL, public anon key, service-role key, and OpenAI API key. Keep `.env.local` out of source control.
2. Apply all files in `supabase/migrations/` in numeric order to the intended Supabase project. Do not recreate an existing database.
3. Install the locked dependencies with `npm ci`.
4. Start the web app with `npm run dev`.
5. Start the background worker in another terminal with `npm run worker`.

The web app and worker require the same Supabase project. The worker uses OpenAI for transcription and evaluation. Calls remain queued until it is running.

## Runtime configuration

| Variable | Used by | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Web, worker | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Web | Supabase public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | Web server, worker | Private Supabase service role; never expose to browsers or commit it |
| `OPENAI_API_KEY` | Worker | ARC AI Engine provider credential |
| `OPENAI_TRANSCRIPTION_MODEL` | Worker | Audio transcription and diarization model |
| `OPENAI_EVALUATION_MODEL` | Worker | Template-evaluation model |
| `VOICE_QA_WORKER_POLL_INTERVAL_MS` | Worker | Queue polling interval; minimum 1000 ms |
| `VOICE_QA_MAX_AUDIO_SIZE_MB` | Web | Maximum accepted audio size; defaults to 100 MB |
| `VOICE_QA_SIGNED_URL_EXPIRY_SECONDS` | Web | Lifetime of private recording playback links; defaults to 300 seconds |

Use the host's secret manager for credentials. Configure the same audio limit on the hosting request-body limit; the current Next.js route receives the uploaded file in a single request. Confirm that the selected web host supports that request size before setting a larger limit.

## Deployment

The repository's `render.yaml` defines the paid Render background worker only. The web app deployment is expected to be configured separately (the worker guide describes Vercel); no web-host configuration is included. The GitHub Actions workflow runs the TypeScript check, full test suite, and production build for pushes and pull requests.

`GET /api/health` returns `200` when the web app's required Supabase configuration is present and `503` otherwise. This is a configuration readiness check; it does not verify connectivity to Supabase or OpenAI.

For a new Supabase project, apply migrations `0001`, `0002`, then `0003`. For an existing project, apply only migrations that have not already been applied. Configure all required values from `.env.example` in the web host; configure the Supabase URL, service-role key, OpenAI key, model names, and poll interval in Render for the worker. Never place secrets in the Blueprint or repository as literal values.

See [the Render worker guide](docs/render-worker.md) for worker setup and operational checks. After deployment, verify sign-in, organization setup, template activation, a representative recording upload, transcript/evidence playback, evaluation status, and retry behavior against the live services before accepting production traffic.

## Validation commands

- `npm test` runs the Vitest suite.
- `npx tsc --noEmit` runs the TypeScript check.
- `npm run build` creates the production Next.js build.
