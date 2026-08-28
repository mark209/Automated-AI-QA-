# Task 1 Report — Reliable local/runtime baseline

## Summary

Task 1 is complete. I stabilized the documented local runtime baseline by pinning the app dev command to port 3000, documenting the app and worker startup commands, and adding a contract test that checks the scripts and required environment names.

## Changed files

- `package.json`
- `README.md`
- `tests/runtime-config.test.ts`

## What changed

- `dev` now runs `next dev -p 3000` so the documented local URL matches the actual app command.
- `worker` already loaded `.env.local`, so I left the script unchanged.
- `README.md` now documents:
  - `npm run dev`
  - `http://localhost:3000`
  - port 3000 conflict handling
  - `npm run worker`
  - the required environment variables in `.env.example` / `.env.local`
- Added `tests/runtime-config.test.ts` to assert:
  - the documented scripts exist
  - the app script is pinned to port 3000
  - the worker script loads `.env.local`
  - the required environment names are present in `.env.example`

## Verification

### Focused test

Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

Result:

- First run failed as intended because `package.json` still had `dev: "next dev"`.
- After the runtime change, the same command passed.

### Full suite

Command:

`cmd /c npm test`

Result:

- Passed: 9 test files, 21 tests.

### App runtime check

Command:

`cmd /c npm run dev`

Verification:

- Started a fresh Next dev server on port 3000.
- `Invoke-WebRequest http://127.0.0.1:3000/login?next=%2F` returned `200`.
- The response body contained the login page content and did not contain a Next framework error shell marker such as `__next_error__` or `__webpack_modules__`.

### Worker runtime check

Command:

`cmd /c npm run worker`

Verification:

- The worker process started with `.env.local` loaded.
- It stayed alive during the check window, which confirmed the documented worker command runs successfully in this workspace.

## Notes

- I did not change `package-lock.json`; the runtime baseline was recoverable without a dependency repair.
- A stale dev server was already occupying port 3000 during verification, so I stopped it and restarted the app cleanly.
- The dev logs still emit the existing `@next/swc-win32-x64-msvc` warning, but after a clean restart it did not block the app from serving the expected response.

---

## Fix round 1

### Open findings addressed

- Reproduced and repaired the invalid `@next/swc-win32-x64-msvc` native runtime in the local install.
- Replaced the shallow text-only runtime test with a bounded startup smoke check that launches `npm run dev`, probes the login page, and tears the server down.
- Verified actual app startup against the documented URL instead of relying on script text or prior logs.
- Updated `README.md` so the documented baseline matches the verified local behavior.
- Added exact red/green/full-suite evidence for this round.

### Files changed in this round

- `README.md`
- `tests/runtime-config.test.ts`

### TDD and verification evidence

#### RED

- Updated `tests/runtime-config.test.ts` first so it would:
  - run the documented `dev` script,
  - fail on the native SWC load error,
  - request `http://127.0.0.1:3000/login?next=%2F`,
  - reject framework error-page markers,
  - stop the spawned process tree.
- Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

- Result:

`FAIL tests/runtime-config.test.ts > runtime configuration > starts the documented dev server and serves the login page without native runtime errors`

- Failure detail:

`Attempted to load @next/swc-win32-x64-msvc ... is not a valid Win32 application.`

#### Root cause and repair

- Direct reproduction with `cmd /c npm run dev` showed the same native SWC error before the server became usable.
- `cmd /c npm install` left the failure unchanged.
- Repair command:

`cmd /c npm install @next/swc-win32-x64-msvc@15.5.23 --no-save --force`

- After the reinstall, `cmd /c npm run dev` reached `Ready in 6.7s` on a clean port and no longer emitted the native SWC load failure.

#### GREEN

- Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

- Result:

`PASS tests/runtime-config.test.ts (2 tests)`

- The passing smoke check now proves that the documented dev command:
  - starts on port 3000,
  - serves the login page,
  - returns content containing `Voice QA`,
  - does not surface `__next_error__`,
  - does not emit the native SWC load warning,
  - does not leave the dev server running after the test finishes.

#### Full suite

- Command:

`cmd /c npm test`

- Result:

`PASS 9 test files, 22 tests`

### Additional runtime evidence

- Bounded worker check command:

`npm run worker`

- Result:

The worker process stayed alive for a 5-second check window with no stderr output and was then terminated intentionally to avoid leaving background processes running.

### Notes for this round

- `package-lock.json` was inspected but did not require an in-repo change for this fix round.
- Git metadata is read-only in this workspace snapshot and there are no commits available to reference from this task state, so no commit hashes were produced.

---

## Recovery round 2

This section supersedes the fix-round claims above where they conflict with the evidence below. In particular, the prior fixed-port smoke check could pass against an unrelated server already listening on port 3000, and its cleanup could orphan the actual Next process.

### Scope and files changed

- `tests/runtime-smoke.test.ts` (new): real Next startup/login smoke test on an OS-assigned port.
- `tests/runtime-config.test.ts`: retained script/environment contract coverage and removed brittle README prose assertions.
- `README.md`: documented the separate config and runtime smoke commands.
- `.superpowers/sdd/2026-08-28-voice-qa-core-flow-and-ux/task-1-report.md`: appended this exact recovery evidence.
- `package-lock.json` was inspected but not changed in this round.

### Runtime test behavior

- Starts the installed Next CLI directly with `dev -H 127.0.0.1 -p 0`, allowing the OS to assign an unused port.
- Waits for the child process to announce readiness, then performs a real request to `/login?next=%2F`.
- Requires a successful response containing `Voice QA` and rejects framework error-page markers.
- Fails immediately on fatal native SWC messages (`not a valid Win32 application` or `failed to load SWC binary`) and Next framework startup failure (`Failed to start server`).
- Does not fail solely because of an SWC warning when the app serves successfully.
- Uses separate bounded deadlines for startup (45 seconds) and cold login compilation/response (60 seconds), with a 120-second Vitest bound.
- Runs cleanup in `finally`, sends termination to the direct Next CLI child, and waits for that child to exit. A post-test process inspection found no Next process from the smoke run.

### TDD and diagnostic evidence

#### False-positive reproduction

Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

Initial result before tightening provenance:

- Exit 0: 1 file and 2 tests passed in 14.11 seconds.
- Port 3000 was already occupied, proving the fixed-port test had accepted the response from a different process.

#### RED: prove the response belongs to the spawned child

The test was changed first to require its own child to announce readiness before accepting the login response.

Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

Result:

- Exit 1.
- Failure: `Port 3000 was already in use during the runtime smoke check.`
- Next diagnostic: `Failed to start server` / `EADDRINUSE` on port 3000.

This established the required production change: isolate the runtime smoke from the documented shared port.

#### RED: first ephemeral-port implementation

Command:

`cmd /c npm test -- tests/runtime-smoke.test.ts`

Result:

- Exit 1 after 49.83 seconds.
- Next started on ephemeral port 53899, reached `Ready in 11.1s`, and began compiling `/login`.
- The original 45-second global deadline expired during cold login compilation; no fatal framework or SWC error was logged.

The wait was split into readiness and one bounded login request so repeated short request aborts could not interfere with cold compilation.

#### GREEN: runtime smoke

Command:

`cmd /c npm test -- tests/runtime-smoke.test.ts`

Result:

- Exit 0.
- 1 file and 1 test passed.
- Runtime smoke passed in 45.538 seconds; total command duration was 48.19 seconds.

Because the app served successfully, no SWC dependency or lockfile repair was made.

#### Focused config test

Command:

`cmd /c npm test -- tests/runtime-config.test.ts`

Result:

- Exit 0.
- 1 file and 1 test passed; test duration was 7 ms.

#### Final combined Task 1 verification

Command:

`cmd /c npm test -- tests/runtime-config.test.ts tests/runtime-smoke.test.ts`

Result:

- Exit 0.
- 2 test files and 2 tests passed.
- Runtime smoke passed in 51.328 seconds; total Vitest duration was 56.63 seconds.
- A process inspection after the command found no remaining Next CLI or Next server child for this workspace.

### Full-suite evidence

Command:

`cmd /c npm test`

Result after the Task 1 correction:

- Exit 1.
- 10 test files passed and 1 test file failed; 22 tests passed and 1 test failed.
- `tests/runtime-smoke.test.ts` passed in 66.140 seconds.
- `tests/runtime-config.test.ts` passed.
- The only failure was outside Task 1: `tests/analyze-page.test.tsx` expects a label matching `Drop an audio recording here`, while the rendered analyze page contains `Choose an audio recording`.
- No out-of-scope UI or test file was changed to mask this failure.

### Assumptions, risks, and side effects

- The runtime check exercises the installed Next version (`15.5.23`) and actual login route using the workspace environment.
- Cold compilation is intentionally allowed up to 60 seconds after readiness; observed runtime in this workspace was approximately 45-66 seconds.
- A pre-existing Next dev process for this workspace held the Next development lock and was stopped after its exact command line and PIDs were verified.
- No dependency installation, package/lockfile change, Git operation, or commit was performed in this round.
