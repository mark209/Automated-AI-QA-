import { processNextTranscriptionJob } from "./transcription";
import { processNextEvaluationJob } from "./evaluation";

const intervalMs = Number(process.env.VOICE_QA_WORKER_POLL_INTERVAL_MS ?? 5000);

async function run() {
  try {
    const transcribed = await processNextTranscriptionJob();
    if (!transcribed) await processNextEvaluationJob();
  } catch (error) {
    console.error("Voice QA worker error:", error instanceof Error ? error.message : JSON.stringify(error));
  }
  setTimeout(run, intervalMs);
}

void run();
