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

## 3. Push in order: local → Test → Main, gated by a live regression pass

Never push straight to `Main`. Commit locally, push to `Test` — Vercel and
Koyeb both auto-deploy `Test` on every push via their own native Git
integrations (separate project/App from production, own database, own
secrets). Then, before `Main` is even brought up as an option:

1. Run `pnpm test` (the full Vitest suite) — it must be green.
2. Run a full live regression pass against the deployed Test URLs: walk
   every given/when/then scenario in
   [`docs/test-scenarios.md`](docs/test-scenarios.md), including the
   "Button sweeps" checklist, through the real Vercel Test frontend and
   real Koyeb Test backend — never localhost. Use a dedicated QA account,
   not the account holding real migrated data, so a sweep never mutates
   real records. See test-scenarios.md's "Regression pass procedure" for
   the operational checklist.
3. Report findings as a punch list in chat. Fix anything broken, push the
   fix to `Test`, and repeat steps 1–2 until the pass is clean.
4. Only after a clean pass, ask the user explicitly whether to promote to
   `Main`. Wait for an explicit yes — never push `Main` unprompted, even
   after a clean pass.
5. After pushing to `Main`, run a **read-only** health check against the
   live production URLs once the deploy finishes: the frontend loads, a
   public page (e.g. `/help`) renders current content, the browser console
   has no errors, and network requests succeed (a working
   `/api/auth/session` call confirms the frontend can reach the backend).
   Never sign in or take any mutating action against production — it holds
   real user data, not a QA account.

`Main` is the production deploy branch: pushing it triggers the Vercel
production deploy and is what the production Koyeb App watches. It should
only ever receive commits that already passed a clean `Test` regression
pass and got explicit sign-off.

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

## 6. New frontend features get help-page instructions

When a change adds something a user can see and use, add a section to
`frontend/src/app/help/page.tsx` (append its id to `SECTIONS` and add a
matching `<Section>`) explaining how to use it, following the existing
sections as the pattern. If the explanation benefits from a picture, add a
schematic SVG illustration to
`frontend/src/components/help/illustrations.tsx` in the same house style
(the `Frame` wrapper, the app's real color tokens, no real financial data).

This is a different surface from rule 4's popup: the popup is a one-time
nudge that a feature exists; the help page is the durable reference a user
returns to later. A feature needs both.

## 7. A bug report on one button is a sweep of that page's buttons

When someone reports a specific button as broken, don't stop at fixing that
one. Click through every other interactive control on the same page or
surface — other buttons, toggles, confirmations — before calling it done. The
"Add your own" investigation on 2026-08-04 is why this is a rule and not a
one-off habit: the reported button turned out to have a second, unreported
bug (a double-click race) that only showed up because the fix was verified
live instead of assumed from the code, and the sweep caught it while already
in the area.

The same applies going the other direction: a **new** feature with more than
one interactive control gets its whole set clicked through, not just the
primary action, before it's called tested.

Record which pages have had a full sweep in the "Button sweeps" section of
[`docs/test-scenarios.md`](docs/test-scenarios.md), and extend that list as
new surfaces get covered — it works the same way as the untested-areas
backlog in rule 2.

## Deploy note

`backend/Dockerfile` runs `prisma migrate deploy` before starting the server, so
a Koyeb container migrates itself on boot. Vercel and Koyeb deploy
independently, so for a schema change the frontend can go live against a
not-yet-migrated database. Apply migrations ahead of the code deploy when a
change is not backward compatible. This applies separately to Test and Main —
they are entirely separate Vercel projects, Koyeb Apps, and databases, each
migrating itself independently on its own boot.
