# Conscious Spending Plan — working agreement

Rules for every change in this repo. They are not optional steps to mention; they
are the definition of a change being finished.

## 1. Pull before you start

`git pull` the branch you are about to work on **before** writing any code. Do
not begin from a stale tree — this repo has more than one long-lived branch and
a worktree under `.claude/worktrees/`, so drift is easy and merge pain is real.

## 2. Every feature ships with a test case and a test scenario

Two distinct artifacts, both required:

- **Test case** — an automated test (Vitest). Run with `pnpm test` from the repo
  root, which fans out to `shared`, `backend`, and `frontend`.
- **Test scenario** — a written given/when/then walkthrough in
  [`docs/test-scenarios.md`](docs/test-scenarios.md), covering what a human
  should click and what they should see.

This applies to **existing** behavior too, not only new work. The codebase had
no tests before 2026-08-03, so when you touch an untested area, add coverage for
it as you go until the backlog in `docs/test-scenarios.md` is closed out.

Prefer tests that exercise real logic over mocks that restate the implementation.
Database-backed integration tests live in `backend/src/**/*.integration.test.ts`
and are skipped automatically unless `DATABASE_URL` points at a **disposable**
database — never a deployed one.

## 3. Push in order: local → Test → Main

Never push straight to `Main`. Commit locally, push to `Test`, confirm it is
healthy, then promote the same commit to `Main`. `Main` is the deploy branch:
pushing to it triggers the Vercel frontend deploy, so it should only ever
receive commits that have already sat on `Test`.

## 4. New frontend features announce themselves

When a change adds something a user can see and use, add an entry to
`frontend/src/components/whats-new/announcements.tsx`. The next time each user
signs in they get a one-time popup explaining the feature with a small inline
graphic. Announcements are account-scoped through the existing `seenTours`
store, so they do not re-fire on a new device.

Keep the copy short and written from the user's side of the screen — what they
can now do, not what we built.

## 5. Security review before Main

Before promoting to `Main`, review both tiers and write the findings into the
PR or commit message:

- **Backend** — every new route behind `requireAuth`; every mutation scoped to
  `req.user.sub` so one account cannot read or write another's rows; all input
  parsed by a Zod schema; no secrets or internals in error responses.
- **Frontend** — no credentials or tokens in client bundles, `localStorage`, or
  URLs; nothing rendered via `dangerouslySetInnerHTML` from user data.
- **Both** — no credentials committed. `.env` and `.env.*` are git-ignored
  except `*.example`; connection strings belong in the Koyeb/Vercel dashboards.

Propose fixes for anything found rather than noting it and moving on.

## Deploy note

`backend/Dockerfile` runs `prisma migrate deploy` before starting the server, so
a Koyeb container migrates itself on boot. Vercel and Koyeb deploy
independently, so for a schema change the frontend can go live against a
not-yet-migrated database. Apply migrations ahead of the code deploy when a
change is not backward compatible.
