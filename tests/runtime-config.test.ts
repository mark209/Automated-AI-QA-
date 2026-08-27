import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

const readme = readFileSync("README.md", "utf8");
const envExample = readFileSync(".env.example", "utf8");

describe("runtime configuration", () => {
  it("documents the local app and worker commands and required environment names", () => {
    expect(packageJson.scripts?.dev).toBe("next dev -p 3000");
    expect(packageJson.scripts?.worker).toBe("tsx --env-file=.env.local workers/voice-qa-worker/index.ts");

    expect(readme).toContain("npm run dev");
    expect(readme).toContain("npm run worker");
    expect(readme).toContain("http://localhost:3000");
    expect(readme).toContain("If port 3000 is busy, stop the conflicting process before restarting the app");

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
