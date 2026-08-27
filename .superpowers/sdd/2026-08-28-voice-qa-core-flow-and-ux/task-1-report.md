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
