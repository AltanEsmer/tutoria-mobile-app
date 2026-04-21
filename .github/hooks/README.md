# Git Hooks

Version-controlled shell-script Git hooks for the Tutoria Mobile App. Each contributor runs `setup.sh` once after cloning to activate them.

## Setup (run once after cloning)

```bash
bash .github/hooks/setup.sh
```

This registers `.github/hooks` as the Git hooks directory and ensures all scripts are executable. Safe to re-run.

---

## Active Hooks

### `pre-commit`
**Trigger:** every `git commit`

Runs ESLint and Prettier before a commit is recorded.

| Step | Command | Fix |
|---|---|---|
| Lint | `npm run lint` | `npx eslint . --ext .ts,.tsx --fix` |
| Format | `npm run format:check` | `npm run format` |

---

### `commit-msg`
**Trigger:** after you write a commit message

Validates the message follows the **Conventional Commits** specification.

**Format:** `type(optional-scope): description`

| Part | Rule |
|---|---|
| `type` | One of: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `revert`, `build` |
| `scope` | Optional, in parentheses — e.g. `(auth)`, `(nfc)` |
| `description` | Required, non-empty |
| First line length | Max 100 characters |

**Examples:**
```
✅ feat(auth): add Clerk sign-in screen
✅ fix(nfc): handle null NDEF payload gracefully
✅ chore: update dependencies
✅ docs: add hooks README

❌ updated stuff
❌ WIP
❌ fix
```

Merge commits (`Merge ...`) and revert commits (`Revert ...`) bypass this check automatically.

---

### `pre-push`
**Trigger:** every `git push`

Runs a full TypeScript type check before any code reaches the remote.

| Command | What it checks |
|---|---|
| `npx tsc --noEmit` | All TypeScript type errors across the project |

---

## Bypassing Hooks (emergency only)

```bash
git commit --no-verify   # skip pre-commit + commit-msg
git push --no-verify     # skip pre-push
```

> Use `--no-verify` sparingly. These hooks protect code quality for the whole team.

---

## Adding a New Hook

1. Create a new shell script in `.github/hooks/` (e.g. `post-checkout`)
2. Add `#!/bin/sh` as the first line
3. Make it executable: `chmod +x .github/hooks/post-checkout`
4. Add it to the `chmod +x` line in `setup.sh`
5. Document it here
