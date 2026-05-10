---
name: run-mobile-checks
description: Run the standard mobile-app verification suite (lint, unit tests, type check) before claiming a change is done.
---

## Purpose

Run this skill before marking any code change as complete. Do not skip steps or reorder them. Stop and report the first failing step — do not continue to subsequent steps after a failure. Fixing a lint error that masks a type error wastes time; surface the root issue first.

## Ordered command sequence

Run the following commands from the repository root (`/home/user/tutoria-mobile-app`):

### Step 1 — Lint

```
npm run lint
```

This runs `eslint . --ext .ts,.tsx` as defined in `package.json`. Fix all errors before proceeding. Warnings are acceptable but must be noted in your report.

### Step 2 — Type check

```
npx tsc --noEmit
```

Uses the project `tsconfig.json`. All type errors must be resolved. Pay particular attention to changes touching `src/utils/types.ts`, which defines shared interfaces (`NfcTagPayload`, `PronunciationCheckRequest`, `PronunciationCheckResponse`) used across hooks, services, and stores.

### Step 3 — Unit tests

```
npm test
```

This runs `jest --config jest.config.cjs`. All tests must pass. Key test files:

- `src/services/nfc/__tests__/tagParser.test.ts` — NFC payload parsing
- `src/stores/__tests__/useNfcStore.test.ts` — NFC store state transitions
- `src/stores/__tests__/useLessonStore.test.ts` — lesson session state
- `src/stores/__tests__/useAuthStore.test.ts` — auth store
- `src/stores/__tests__/useProgressStore.test.ts` — progress store
- `src/services/api/__tests__/progress.test.ts` — progress API
- `src/utils/__tests__/pronunciation.test.ts` — pronunciation utilities
- `src/app/(auth)/__tests__/sign-in.test.tsx` — auth UI

If a test fails, read the full error output before editing. Do not delete or skip tests to make the suite pass.

### Step 4 — Maestro UI tests (conditional)

If your change touches any screen component under `src/app/` or `src/components/`, print the following reminder and do not run automatically (Maestro requires a running device or simulator):

```
Reminder: UI changes detected. Maestro end-to-end tests live under .maestro/
(config: .maestro/config.yaml, flows: .maestro/flows/).
Run them manually with: ./run-maestro-tests.sh
```

## Reporting

After all steps pass, summarise:

- Which steps ran.
- Any warnings from lint (list them).
- Total test count and pass rate from jest output.
- Whether a Maestro reminder was printed.

If any step fails, stop immediately and report: which step failed, the exact error output, and your diagnosis of the root cause. Do not propose a fix until the failure is fully understood.
