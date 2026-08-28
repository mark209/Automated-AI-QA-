import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

const envExample = readFileSync(".env.example", "utf8");

describe("runtime configuration", () => {
  it("defines the documented app and worker scripts and required environment names", () => {
    expect(packageJson.scripts?.dev).toBe("next dev -p 3000");
    expect(packageJson.scripts?.worker).toBe("tsx --env-file=.env.local workers/voice-qa-worker/index.ts");

    for (const requiredVariable of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "OPENAI_API_KEY",
      "OPENAI_TRANSCRIPTION_MODEL",
      "OPENAI_EVALUATION_MODEL",
      "VOICE_QA_WORKER_POLL_INTERVAL_MS",
      "VOICE_QA_MAX_AUDIO_SIZE_MB",
      "VOICE_QA_SIGNED_URL_EXPIRY_SECONDS",
    ]) {
      expect(envExample).toContain(requiredVariable);
    }
  });
});
