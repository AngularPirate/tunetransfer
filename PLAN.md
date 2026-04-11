# TuneTransfer — How We Work

This is the working agreement between Jared and Claude for TuneTransfer sessions. Read it at the start of every session.

## Session rituals

- **Start:** `/start-session` — loads memory, checks current project state, reminds Claude what's in flight.
- **End:** `/end-session` — appends to `sessions_log.md` in memory with what was done, decisions made, what to carry forward, and what to improve next time.
- **Never skip the end-session step.** The session log is where process improvements compound.

## How changes get made

1. **Understand first, edit second.** Read the existing code before touching it. No speculative refactors, no bonus features.
2. **Right-size complexity.** This is a portfolio project, not a production system. Three similar lines beat a premature abstraction.
3. **Design matters.** Warm, minimal, Wispr-inspired aesthetic. Apply product thinking to every UI decision.
4. **Small commits, clear messages.** One logical change per commit. Commit message explains *why*, not *what*.

## Branching

- **Trivial fixes** (typo, copy, one-line bug): commit straight to `main`.
- **Anything else** (feature, refactor, multi-file change, anything touching build/config/env): feature branch → PR → preview → merge.
- Branch names: `fix/confetti-render`, `feat/toast-errors`, `chore/render-yaml`.

### Feature branch flow (the normal case)

```bash
# 1. Start from a clean main
git checkout main
git pull

# 2. Create a branch
git checkout -b fix/short-description

# 3. Make changes, run the pre-push checklist
pnpm build

# 4. Commit (one logical change per commit, message explains why)
git add <specific files>
git commit -m "Short why-focused message"

# 5. Push the branch
git push -u origin fix/short-description

# 6. Open a PR
gh pr create --title "..." --body "..."

# 7. Wait ~5 min for Render to post the preview URL as a PR comment
#    Smoke test the preview URL in the browser — walk the golden path.

# 8. Merge via GitHub UI or `gh pr merge --squash`
#    Prod auto-deploys from main within ~5 min.
```

Never skip step 3 or step 7. Those are the two cheap insurance policies that catch the bugs before users do.

## Pre-push checklist

Before any push to `main` or opening a PR, run locally:

```bash
pnpm build
```

This compiles `shared → client → server` — the same thing Render runs. If it passes locally in ~10 seconds, Render will pass too. This catches the entire class of build-time bugs (missing Vite env vars, TypeScript errors, stale dist output) before they hit prod.

If the change touches the UI, also verify in the browser at `http://127.0.0.1:5173` before pushing. Type checks verify code correctness, not feature correctness.

## Deploy flow

- **Prod:** `https://tunetransfer.onrender.com` — auto-deploys from `main` on push.
- **Previews:** Every PR against `main` gets a disposable `tunetransfer-pr-<n>.onrender.com` URL via Render PR Previews (enabled in service settings). Smoke test there before merging.
- **First build is slow** (~5 min cold), subsequent deploys are faster due to cache.
- **Free tier cold start** (~30-50s) after 15 min inactivity. Expected.

## Environment variables

Live in three places, all three must agree:
1. **Local `.env`** at `tunetransfer/.env` for `pnpm dev`
2. **Render Environment tab** for prod + preview builds
3. **`render.yaml`** as the declarative source of truth (with `sync: false` for secrets — Render prompts on Blueprint apply)

Current vars: `NODE_ENV`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `VITE_SPOTIFY_CLIENT_ID`.

Remember: `VITE_*` vars are baked into the client bundle at **build time**. Changing them requires a rebuild, not a restart.

## Memory system

Memory lives at `~/.claude/projects/-Users-jaredbrodd-agent-lab/memory/`. Claude reads it automatically each session via the `MEMORY.md` index. If something non-obvious comes up — a surprising decision, a repeat mistake, a new constraint — it goes in memory so the next session starts smarter.

## Debugging principles

- **For visual bugs, ask for a DevTools Performance filmstrip or Console/Elements screenshot first.** Don't theorize from code alone — that's cost us multiple bad guesses on this project.
- **When a bug survives many fix attempts, look in a different layer than where everyone's been looking.** The flash bug was `AnimatePresence`, not component state. The confetti bug was framer-motion's `vh` interpolation, not React lifecycle.
- **Fix root causes, not symptoms.** When a hook fails, investigate; don't `--no-verify`.

## What's next

See `memory/project_tunetransfer.md` for the current remaining-work list.
