// @vitest-environment node

import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const nextCliPath = require.resolve("next/dist/bin/next");
const startupTimeoutMs = 45_000;
const loginTimeoutMs = 60_000;
const pollIntervalMs = 100;
const ansiPattern = /\x1B\[[0-?]*[ -/]*[@-~]/g;

function normalizedLogs(logs: string[]) {
  return logs.join("").replace(ansiPattern, "");
}

function fatalStartupError(logs: string) {
  if (/not a valid Win32 application|failed to load SWC binary/i.test(logs)) {
    return "Next dev startup hit a fatal native SWC error";
  }

  if (/Failed to start server/i.test(logs)) {
    return "Next dev reported a framework startup error";
  }
}

async function waitForReadyUrl(devProcess: ChildProcess, logs: string[]) {
  const deadline = Date.now() + startupTimeoutMs;

  while (Date.now() < deadline) {
    const output = normalizedLogs(logs);
    const startupError = fatalStartupError(output);

    if (startupError) {
      throw new Error(`${startupError}.\n\n${output}`);
    }

    if (devProcess.exitCode !== null || devProcess.signalCode !== null) {
      throw new Error(
        `Next dev exited before the login page responded (code ${devProcess.exitCode}, signal ${devProcess.signalCode}).\n\n${output}`,
      );
    }

    const localUrl = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+)/)?.[1];
    if (localUrl && /Ready in/i.test(output)) {
      return localUrl;
    }

    await delay(pollIntervalMs);
  }

  throw new Error(`Timed out after ${startupTimeoutMs}ms waiting for Next dev readiness.\n\n${normalizedLogs(logs)}`);
}

async function fetchLoginPage(localUrl: string, logs: string[]) {
  try {
    const response = await fetch(`${localUrl}/login?next=%2F`, {
      signal: AbortSignal.timeout(loginTimeoutMs),
    });
    const html = await response.text();
    const startupError = fatalStartupError(normalizedLogs(logs));

    if (startupError) {
      throw new Error(`${startupError}.\n\n${normalizedLogs(logs)}`);
    }

    if (!response.ok) {
      throw new Error(
        `Login request returned HTTP ${response.status}.\n\n${normalizedLogs(logs)}\n\n${html.slice(0, 1_000)}`,
      );
    }

    return html;
  } catch (error) {
    const startupError = fatalStartupError(normalizedLogs(logs));
    if (startupError) {
      throw new Error(`${startupError}.\n\n${normalizedLogs(logs)}`, { cause: error });
    }

    if (error instanceof Error && error.message.startsWith("Login request returned HTTP")) {
      throw error;
    }

    throw new Error(
      `Login request did not complete within ${loginTimeoutMs}ms.\n\n${normalizedLogs(logs)}`,
      { cause: error },
    );
  }
}

async function waitForExit(devProcess: ChildProcess, timeoutMs: number) {
  if (devProcess.exitCode !== null || devProcess.signalCode !== null) return;

  await Promise.race([
    new Promise<void>((resolve) => devProcess.once("exit", () => resolve())),
    delay(timeoutMs).then(() => {
      throw new Error(`Next dev did not exit within ${timeoutMs}ms`);
    }),
  ]);
}

async function terminateDevProcess(devProcess: ChildProcess) {
  if (devProcess.exitCode !== null || devProcess.signalCode !== null) return;

  devProcess.kill("SIGTERM");

  try {
    await waitForExit(devProcess, 5_000);
  } catch {
    devProcess.kill("SIGKILL");
    await waitForExit(devProcess, 5_000);
  }
}

describe("Next runtime smoke", () => {
  it("starts on an ephemeral port and serves the login page without fatal startup errors", async () => {
    const logs: string[] = [];
    const devProcess = spawn(
      process.execPath,
      [nextCliPath, "dev", "-H", "127.0.0.1", "-p", "0"],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          NEXT_TELEMETRY_DISABLED: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      },
    );

    devProcess.stdout?.on("data", (chunk) => logs.push(String(chunk)));
    devProcess.stderr?.on("data", (chunk) => logs.push(String(chunk)));

    try {
      const localUrl = await waitForReadyUrl(devProcess, logs);
      const html = await fetchLoginPage(localUrl, logs);

      expect(new URL(localUrl).port).not.toBe("3000");
      expect(html).toContain("Voice QA");
      expect(html).not.toContain("__next_error__");
      expect(html.toLowerCase()).not.toContain("application error");
    } finally {
      await terminateDevProcess(devProcess);
    }
  }, 120_000);
});
