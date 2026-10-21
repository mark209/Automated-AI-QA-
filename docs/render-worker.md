# Deploy the processing worker

The Vercel website queues recordings. A separate Render background worker must stay running to transcribe and evaluate them. This setup uses the existing Supabase database and storage, with one worker instance. Render background workers require paid compute; review the price shown before applying the Blueprint.

1. Commit and push these changes, including `render.yaml`, to the GitHub `master` branch.
2. Open https://dashboard.render.com/blueprint/new?repo=https://github.com/mark209/Automated-AI-QA- and connect GitHub if prompted.
3. Select `master`, and enter the requested environment variables directly in Render. Use the same Supabase project as the Vercel website. Copy `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `OPENAI_EVALUATION_MODEL` from your existing deployment configuration. Do not put secret values in GitHub.
4. Review the worker plan and click Apply. The worker uses `npm ci --include=dev` to install the TypeScript runner and `npm run worker:start` to start using hosted environment variables, without a local `.env.local` file.
5. Confirm the logs show `ARC AI Engine worker started`. Existing QUEUED jobs are picked up automatically; do not re-upload recordings. Running the worker incurs OpenAI usage as it processes pending recordings.
6. Open a queued recording on the website. Confirm transcription starts, the transcript appears, and evaluation completes against its selected template. Confirm the job attempts increase and completed timestamps are saved. Check logs for missing configuration, database RPC errors, and OpenAI quota failures if it does not progress.
7. Deploy the web changes on Vercel as well to show corrected statuses and delayed-processing messages.

Apply all repository Supabase migrations in order for a new database, including the evaluation queue migration. Do not recreate the database for an existing deployment. Stop temporary local workers once the hosted worker is running.

The delay message is based on job age, not a worker heartbeat. Jobs already stuck in PROCESSING after a crash still need investigation; this change does not automatically replay possibly billed jobs. If a Render restart interrupts a job, inspect its saved transcript/evaluation and job status before manually retrying it.
