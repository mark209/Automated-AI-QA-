import { processNextTranscriptionJob } from "./transcription";
import { processNextEvaluationJob } from "./evaluation";

const intervalMs = Number(process.env.VOICE_QA_WORKER_POLL_INTERVAL_MS ?? 5000);

async function run() {
  let processed = false;
  try {
    const transcribed = await processNextTranscriptionJob();
    processed = transcribed || await processNextEvaluationJob();
  } catch (error) {
    console.error("Voice QA worker error:", error instanceof Error ? error.message : JSON.stringify(error));
  }
  setTimeout(run, processed ? 0 : intervalMs);
}

void run();
