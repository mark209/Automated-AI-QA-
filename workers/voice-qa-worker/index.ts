import { processNextTranscriptionJob } from "./transcription";
import { processNextEvaluationJob } from "./evaluation";

const intervalMs = Number(process.env.VOICE_QA_WORKER_POLL_INTERVAL_MS ?? 5000);

for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"]) {
  if (!process.env[key]) throw new Error(`Worker configuration missing: ${key}`);
}
if (!Number.isFinite(intervalMs) || intervalMs < 1000) throw new Error("Worker poll interval must be at least 1000 ms.");
console.info("Voice QA worker started; polling transcription and evaluation queues.");

async function run() {
  let processed = false;
  try {
    const transcribed = await processNextTranscriptionJob();
    const evaluated = await processNextEvaluationJob();
    processed = transcribed || evaluated;
    if (processed) console.info("Voice QA worker completed a processing cycle.");
  } catch (error) {
    console.error("Voice QA worker error:", error instanceof Error ? error.message : JSON.stringify(error));
  }
  setTimeout(run, processed ? 0 : intervalMs);
}

void run();
