# Test scenarios

Manual walkthroughs to pair with the automated suite (`pnpm test`). Rule 2 of
[`CLAUDE.md`](../CLAUDE.md) requires every feature to have both.

Each scenario is given / when / then. Run them against a **disposable**
database, never a deployed one.

---

## Regression pass procedure (live Test environment)

Rule 3 of [`CLAUDE.md`](../CLAUDE.md) requires this pass, clean, before ever
asking the user for a `Main` go-ahead. It runs against the real deployed
Test environment (separate Vercel project + Koyeb App/Postgres, auto-deployed
from the `Test` branch) — not localhost, and not the disposable database used
for the scenarios below.

1. `pnpm test` from the repo root — must be green.
2. Confirm both the Vercel Test deploy and the Koyeb Test deploy succeeded,
   and `GET <koyeb-test-url>/health` responds.
3. Sign in to the live Vercel Test URL with the **dedicated QA account**
   (`qa-test@conscious-spending-plan.test`, seeded with 12 months of
   realistic plan/transaction/budget data — see `deployment-topology`
   memory for how it was built) and walk every scenario in this file
   end-to-end (Budget, What's New, Plan calculations, "Add your own,"
   Validation and errors, Account recovery, Bulk delete) plus the full
   "Button sweeps" checklist below, against the real deployed frontend and
   backend. Register a second, throwaway account instead for any scenario
   that needs an empty/fresh state.
4. Verify each control the way "Button sweeps" already defines: a real
   network request or state change, not just visual appearance.
5. Log every deviation as a punch-list item, report it to the user, fix, push
   to `Test`, and repeat from step 1 until clean.

Only once this pass is clean does the assistant ask the user whether to
promote to `Main` — never push `Main` unprompted, even after a clean pass.

---

## Budget

### B1 — Budget a month for the first time
- **Given** a signed-in account with fixed-cost categories and no budget for the month
- **When** opening **Budget**, ticking four categories and entering amounts
- **Then** each row appears on the right with its amount, the header counter reads `4 / 10 categories`, and BUDGETED TOTAL equals the sum
- **And** reloading the page keeps every value (saves are debounced ~500ms, so pause before reloading)

### B2 — The ten-category cap
- **Given** a month with ten categories already selected
- **When** looking at the remaining categories
- **Then** their checkboxes are disabled and captioned "Remove one to add another", and the counter turns orange
- **And** unticking one re-enables the rest
- *Server side:* `PUT /budget-targets` with 11 entries returns **400**, not 200 — the cap cannot be bypassed by calling the API directly

### B3 — Ticking several categories quickly
- **Given** a month with four categories selected
- **When** ticking six more in fast succession
- **Then** all six register and the counter reads `10 / 10`
- *Regression:* each handler previously closed over the render-time list, so rapid clicks overwrote each other and only one landed

### B4 — Months are independent
- **Given** August budgeted with ten categories
- **When** stepping to September, budgeting one category, and stepping back
- **Then** August still has its ten, unchanged
- **And** stepping from January back one month lands on **December of the previous year**

### B5 — Copy last month's budget
- **Given** a month with a budget, and the next month empty
- **When** opening the empty month
- **Then** a "Copy <month>'s budget" button appears; using it pre-fills the same categories and amounts
- **And** editing the new month does not change the one it was copied from
- **And** the button is absent once the month has any targets

### B6 — Planned vs actual on the plan page
- **Given** a plan whose month has budgets, and categorized transactions
- **When** viewing Fixed Costs
- **Then** the columns read Category / Planned / Actual / Over-Under, and each category shows:

  | Case | Planned | Actual | Chip |
  |---|---|---|---|
  | Spent exactly the budget | $2,100 | $2,100 | `even`, grey |
  | Overspent | $650 | $712 | `+$62`, red |
  | Underspent | $180 | $164 | `−$16`, green |
  | Budgeted, nothing spent | $220 | $0 | `−$220`, green |
  | Spent, never budgeted | — | $288 | *(blank — no chip until the category has a budget)* |

- **And** the budgeted-but-unspent row is visible — before this feature those rows were filtered out entirely
- **And** Investments and Savings show **no** planned columns

### B7 — Narrow screens
- **Given** the plan page at a viewport under 640px
- **When** viewing Fixed Costs
- **Then** each row is two lines — category and actual on top, `Planned $X` and the chip beneath
- **And** the page does not scroll sideways; the nav links scroll within the bar instead

### B8 — Dashboard chart
- **Given** a **locked** plan for a budgeted month (drafts do not appear on the dashboard)
- **When** viewing "Spending vs Plan"
- **Then** planned and actual differ per category
- **And** a budgeted-but-unspent category charts as planned with zero actual
- **And** an unbudgeted category with spending charts as actual with zero planned

### B9 — Deleting a category preserves history
- **Given** a category budgeted in a past month
- **When** deleting it from the library
- **Then** it disappears from the picker and from newly created plans
- **But** the past month still shows it, with its original label and amount, tagged `archived`
- **And** re-adding a category with the same name revives the original rather than erroring or silently doing nothing

### B10 — One account cannot touch another's budget
- **Given** two accounts
- **When** account B calls `PUT /budget-targets` with a category id belonging to account A
- **Then** the response is **400** and nothing is written
- **And** account B sees only its own targets for that month

---

## What's New announcements

### W1 — First sign-in after a feature ships
- **Given** an account that has not seen the current announcement
- **When** signing in
- **Then** a popup appears with the title, a short description, and a small graphic of the feature
- **And** the primary button navigates to the feature

### W2 — It only shows once
- **Given** an account that dismissed the announcement
- **When** signing in again, including from a different browser
- **Then** no popup appears — the flag is stored on the account, not in the browser

### W3 — Dismissal
- **Given** the popup is open
- **When** pressing Escape, clicking the backdrop, the × or "Got it"
- **Then** it closes and does not return

---

## Plan calculations (pre-existing behavior, covered 2026-08-03)

### P1 — Miscellaneous is computed, never stored
- **Given** a plan with fixed costs and Miscellaneous enabled
- **Then** the fixed-costs total is the subtotal plus 15%, and no line item for it exists
- **And** disabling it drops the uplift immediately

### P2 — Guilt-free spending
- **Given** net income with fixed costs, investments and savings
- **Then** guilt-free equals net income minus all three
- **And** it displays as **negative** when the plan overspends, rather than clamping at zero

### P3 — A brand-new plan
- **Given** a plan with income not yet entered
- **Then** percentages read 0%, never `NaN%` or `Infinity%`

### P4 — Excluding a line
- **Given** a fixed-cost, investment, or savings line (Investments gained the
  eye icon 2026-08-04 — see PA5)
- **When** clicking the eye icon
- **Then** the line greys out, drops from its section total, and guilt-free updates

---

## "Add your own" (Investments / Savings) — fixed 2026-08-04

**Bug report:** users said the Investments "+ Add your own" button did nothing.
Root cause: the button always sent the literal label `"New Item"`. The backend
treats adding an already-existing category name as a no-op (correct for the
Transactions page's "type a name to add it" flow, where re-adding an existing
name should just reuse it silently) — but the button never renames that
library entry even after the user renames their copy of the row on the plan,
so the *second* click ever, in either section, collided with the first
`"New Item"` and silently did nothing. Confirmed via two identical `POST
/plans/:id/items` requests returning byte-identical plans.

### PA1 — Clicking it twice in a row adds two distinct rows
- **Given** an Investments section with no custom rows yet
- **When** clicking "+ Add your own" twice, with a normal pause between clicks
- **Then** two new rows appear: "New Item" and "New Item 2" — not one row,
  and not a duplicate

### PA2 — Two clicks close enough together don't race
- **Given** the button was just clicked and its request hasn't returned yet
- **Then** the button is disabled until it does, closing the window where two
  rapid clicks would both compute the same "next" label from the same
  not-yet-updated category list and collide
- *Regression:* before the button disabled itself, a genuine double-click
  (both `handleAddItem` calls firing before either response returned) still
  produced only one new row instead of two

### PA3 — Works the same in Savings, independently of Investments
- **Given** Investments already has "New Item" through "New Item 5"
- **When** clicking "+ Add your own" under Savings Goals for the first time
- **Then** the new row is plain "New Item" — the two sections don't share a
  collision namespace

### PA4 — Plan-page button sweep (2026-08-04)
Also clicked through and confirmed still working: Lock plan / Unlock plan
(status banner and dashboard-visibility text flip correctly), Miscellaneous's
remove button, a line item's delete button, and the Notes section's
expand/collapse toggle. Drag-to-reorder wasn't exercised (gesture-based, not
a discrete click) but its code path was read and matches the pattern used by
every other reorder-capable section.

### PA5 — Investments gained the exclude (eye) toggle (2026-08-04)

A follow-up report claimed three things were broken: Savings' "Add your own,"
delete on Investments/Savings rows, and the eye icon not isolating its row
across Fixed Costs/Investments/Savings. Re-tested all three on a **brand-new
account and a brand-new browser tab** (see the methodology note below) —
"Add your own" and delete both worked correctly, and the eye toggle correctly
isolated to just the clicked row with no cross-row or cross-section bleed.
The one real, confirmed gap: **Investments never had an eye icon at all** —
`InvestmentsSection` simply never accepted or passed an `onToggleExclude`
prop, unlike `SavingsSection`. Added it, threading through the same
`onToggleExclude`/`useToggleExcludeLineItem` plumbing Savings already used;
`investmentsTotal`'s calculation already excluded flagged rows (it was just
unreachable from the UI), so no calculation changes were needed.

- **Given** an Investments line with amount $500 (excluded) and another with
  amount $300 (not excluded)
- **Then** `INVESTMENTS TOTAL` reads $300 — the excluded row's amount drops
  out, same as it already did for Fixed Costs and Savings

**Methodology note, for next time:** the first attempt to reproduce the eye-
icon report gave an alarming false positive — three unrelated line items
appeared to vanish after one click. Investigating further showed this was an
artifact of reusing one browser tab across dozens of logins, plan
navigations, and HMR reloads earlier in the same long session — stale timers
and duplicate listeners fired against the wrong plan. Re-running the exact
same click in a **fresh tab against a freshly registered account** gave a
clean, correct result. When a report doesn't match what the code plainly
does, suspect the test session before the product — but verify that
suspicion by actually isolating and re-running, don't just assert it.

---

## Validation and errors (pre-existing, covered 2026-08-03)

### V1 — Shared schemas return 400
- **When** calling `POST /plans` with `month: 13`
- **Then** the response is **400 Validation Error** with a `details` array
- *Regression:* `@csp/shared` is CommonJS while the server is ESM, so its ZodErrors failed an `instanceof` check and every such failure returned **500**

### V2 — Internals stay server-side
- **When** an unexpected error occurs
- **Then** the response is a generic 500 with no stack trace, connection string, or library name

---

## Account recovery (hardened 2026-08-03)

A third-party-style security assessment found the password-reset flow let
anyone confirm an email was registered and learn exactly which security
question protected it, with only per-IP rate limiting standing between that
and brute-forcing the answer. The flow below replaces it.

### AR1 — An unregistered email fails exactly like a wrong answer
- **Given** `nobody@example.com` has no account
- **When** submitting the reset form with any question and answer
- **Then** the error message is the same generic text used for a wrong
  answer on a real account — nothing distinguishes "no such account" from
  "wrong guess"

### AR2 — The wrong question fails even with the right answer
- **Given** an account whose real security question is "What city were you
  born in?" with answer "Chicago"
- **When** submitting a *different* question from the dropdown alongside the
  correct answer text "Chicago"
- **Then** the reset fails with the same generic message — the question and
  answer are checked together, not the answer alone

### AR3 — Correct email, question, and answer reset the password
- **Given** the right combination for a real account
- **Then** the password updates, every existing session (access + refresh
  tokens) is invalidated, and the user can sign in with the new password but
  not any previously-issued token

### AR4 — Five wrong guesses lock the account, independent of IP
- **Given** an account with 4 prior failed reset attempts this window
- **When** a 5th guess also fails
- **Then** the account is locked for 15 minutes — a *correct* answer
  submitted during the lock still fails with the same generic message, so
  switching IPs to dodge the per-IP rate limiter doesn't help
- **And** the lock does not extend itself further while active

### AR5 — Answers are case- and whitespace-insensitive
- **Given** the real answer is "Chicago"
- **When** submitting `  chicago  `
- **Then** the reset succeeds

---

## Bulk delete transactions (2026-08-03)

### BD1 — Selecting a few rows and deleting them
- **Given** a plan with several transactions
- **When** ticking the checkboxes on 3 rows and clicking "Delete Selected"
- **Then** a confirmation modal names the count, and confirming removes
  exactly those 3 rows from the table

### BD2 — Deleted rows are recoverable, not gone
- **Given** a bulk delete just completed
- **When** opening "Deleted Transactions"
- **Then** all of them appear there, each individually restorable — the
  confirmation copy says so rather than claiming this can't be undone,
  which is why it doesn't need the same weight as Reset Plan

### BD3 — Select all only means "all visible"
- **Given** a keyword filter narrows the table to 2 of 10 transactions
- **When** clicking the header checkbox
- **Then** only those 2 are selected — the other 8 (filtered out) are
  untouched, and the selection count reads 2

### BD4 — The header checkbox reflects a partial selection
- **Given** 2 of 5 visible rows are individually ticked
- **Then** the header checkbox shows the indeterminate (dash) state, not
  checked or unchecked

### BD5 — A completed delete can't reference stale ids
- **Given** rows A and B are selected
- **When** row A is deleted by some other action before the bulk delete runs
  (e.g. a second browser tab)
- **Then** the selection silently drops A, so a subsequent bulk delete only
  ever sends ids that still exist

### BD6 — One account cannot delete another's transactions
- **When** submitting a transaction id belonging to a different account to
  `POST /transactions/bulk-delete`
- **Then** the request is rejected and nothing is deleted, including any
  ids in the same request that *do* belong to the caller — a partial match
  fails the whole batch rather than silently completing a subset

---

## Income linkage (2026-08-08)

Deposits (positive-amount transactions) can be tagged with an Income category,
the same way expenses are tagged Fixed Costs. Net Monthly Income auto-computes
from tagged deposits once any exist for the plan; with none tagged it stays the
existing manual field. Direction (the transaction's sign), not payment method,
decides eligibility — a Zelle *received* is a deposit; a Zelle *sent* stays an
expense category exactly as before.

### IL1 — Tagging a deposit switches Net Income to automatic
- **Given** a plan with its Net Monthly Income entered manually, and a
  positive-amount transaction (e.g. a paycheck deposit)
- **When** opening its category dropdown, choosing the **Income** group, and
  selecting (or adding) a category like "Paycheck / Salary"
- **Then** the Income section on the plan page switches from an editable field
  to a read-only breakdown row for that category, the Net Income total updates
  to match, every percentage (Fixed Costs %, Savings %, Guilt-Free) recomputes
  against the new figure, and a caption explains it's now auto-calculated

### IL2 — Zero income transactions leaves the manual field untouched
- **Given** a brand-new plan, or one with no transactions ever tagged Income
- **Then** Net Monthly Income is still a plain editable field, saves normally,
  and behaves exactly as it did before this feature — this is the top
  regression risk for this change and must never break

### IL3 — Untagging reverts the automatic total
- **Given** a plan with exactly one transaction tagged Income
- **When** changing that transaction's category to Uncategorized (or to a
  different section)
- **Then** Net Income falls back to the last manually-entered value, and the
  field becomes editable again

### IL4 — Every mutation path recomputes, not just categorizing
- **Given** a plan with two transactions tagged Income
- **When**, in turn: deleting one, restoring it from Deleted Transactions,
  bulk-deleting both, importing a new CSV whose payroll description already
  matches saved category memory (auto-tagged on insert, no manual step)
- **Then** Net Income updates correctly after each step
- **And** the Plans list card and the dashboard's Income trend chart (which
  read a separate aggregate, not the plan detail page) reflect the same
  number after each step — not just the currently-open plan page

### IL5 — The exclude toggle applies to income categories too
- **Given** two income categories with tagged deposits
- **When** clicking the eye icon to exclude one
- **Then** it goes transparent/struck-through, drops out of the Net Income
  total, and Guilt-Free Spending updates accordingly; toggling it back
  restores both

### IL6 — Renaming or deleting an income category cascades correctly
- **Given** an income category used across two unlocked plans
- **When** renaming it from the category dropdown's edit mode
- **Then** both plans' transactions and line items pick up the new label with
  the same total
- **When** deleting it instead
- **Then** its transactions become uncategorized on every unlocked plan, its
  category-memory keywords are removed (so auto-categorize won't re-tag future
  imports to it), and Net Income recomputes on every affected plan — not just
  the one the edit was made from

### IL7 — Locked plans still allow tagging (a deliberate exception)
- **Given** a locked plan with an untagged deposit
- **When** categorizing it as Income
- **Then** the assignment succeeds and Net Income recomputes — locking only
  blocks category-*library* edits (add/rename/delete a category), matching
  the same rule Fixed Costs already follows

### IL8 — Sign rules in the category dropdown
- **Given** a negative-amount transaction (a normal expense)
- **Then** the dropdown shows the Fixed Costs group only; the Income group
  shows "Income applies to deposits only" instead of a category list
- **Given** a positive-amount transaction (a refund landing back in a fixed
  cost, or a real deposit)
- **Then** **both** groups are available — Fixed Costs stays selectable even
  for a positive amount, since a refund legitimately belongs there
- **Given** a transaction already tagged Income whose amount is no longer
  positive (e.g. after re-importing under a different sign convention)
- **Then** its income category still renders (flagged with a warning icon) so
  it can be seen and corrected, rather than silently displaying "Uncategorized"
  while the database still says Income

### IL9 — Existing accounts are backfilled
- **Given** an account created before this feature shipped
- **Then** its category library already has the default Income categories
  (Paycheck / Salary, Side Income, Gifts / Reimbursements, Transfers, Interest
  / Dividends) without any manual action, and every one of its *unlocked*
  plans already has matching line items — locked plans are untouched

### IL10 — Excel export matches the app
- **Given** a plan with tagged income transactions
- **When** exporting to Excel
- **Then** the Net Income figure matches what the app shows, and the income
  category breakdown appears in the sheet the same way Fixed Costs does

---

## Dashboard period-aware cards, pie chart, mandatory account type, performance (2026-08-07)

### DB1 — Spending vs Plan and Top Movers are period-aware
- **Given** the dashboard with several locked months, some in different years
- **When** switching the Month/Year/All-time toggle
- **Then** Spending vs Plan's bars and Top Movers' deltas recompute to match
  the selected range (a single month; every locked month in the selected
  year; every locked month ever) — previously these two cards always showed
  the single selected month regardless of the toggle

### DB2 — Top Movers' comparison period follows the same toggle
- **Given** Month mode with a prior locked month available
- **Then** Top Movers compares against that prior month (unchanged behavior)
- **Given** Year mode
- **Then** it compares against the prior calendar year's locked months, with
  its own empty-state copy ("needs a prior year with locked months") when
  there isn't one
- **Given** All-time mode
- **Then** there's no natural "prior" period, so Top Movers shows "compares
  two periods — switch to Month or Year to see it" instead of a fabricated
  comparison

### DB3 — Fixed costs pie chart
- **Given** any period with fixed-cost spending
- **Then** a donut chart renders each category as a distinct-colored slice,
  capped at 8 real categories with the remainder rolled into one "Other (N
  categories)" slice, alongside a text legend list (also the accessible
  fallback, since the chart itself exposes nothing to screen readers)
- **When** clicking a slice in Month mode
- **Then** it navigates to that month's Transactions page pre-filtered to
  the clicked category
- **When** clicking a slice in Year or All-time mode
- **Then** nothing navigates — the slice highlights instead (click again to
  un-highlight), since there's no single plan to open
- **Given** no fixed-cost spending yet for the selected period
- **Then** the card shows an empty-state message instead of a blank chart

### DB4 — The exclude toggle and pie chart/Spending-vs-Plan agree
- **Given** a fixed-cost category marked excluded on the current plan
- **Then** it's absent from both the pie chart and Spending vs Plan (actual
  and planned) — previously Spending vs Plan ignored the exclude toggle
  entirely

### DB5 — Cross-account isolation on the new summary endpoint
- **Given** two separate accounts, each with their own locked plans
- **Then** one account's dashboard never shows the other's categories or
  totals, even if plan ids were guessed or replayed — the endpoint silently
  drops any requested plan id that isn't the caller's own

### AT1 — Account type is mandatory before Import unlocks
- **Given** the Import CSV modal with a file parsed and previewed
- **Then** the account-type selector shows a disabled "Select an account
  type…" placeholder and the Import button is disabled
- **When** picking any option (including "Use each row's value from the
  file")
- **Then** the Import button enables

### AT2 — "Use each row's value from the file" stays available and non-blocking
- **Given** a CSV with a mix of rows that do and don't specify an account
  type column
- **When** choosing "Use each row's value from the file"
- **Then** an amber note shows how many rows lack a resolvable account type,
  but Import stays enabled and proceeds — combined-account CSVs must keep
  working
- **When** instead choosing a specific account type (Credit Card / Checking /
  Savings)
- **Then** it overrides every row, the amber note disappears, and the
  remembered sign-convention preference for that account type still loads
  the same as it did before this change

### PF1 — Performance indexes apply cleanly
- **Given** the Test database after this batch's migration runs
- **Then** `transaction_imports` has an index on `spending_plan_id` and
  `transactions` has a composite index on `(import_id, spending_category,
  deleted_at)` — purely additive, no behavior change to verify beyond "the
  migration applies without error"

### PF2 — Code-split components render without regressions
- **Given** a plan page with Notes collapsed
- **Then** TipTap doesn't load until Notes is expanded (network tab shows its
  chunk requested only on expand), and the editor works normally once loaded
- **Given** the dashboard page
- **Then** each chart shows a brief skeleton placeholder before Recharts
  loads, with no layout jump, hydration warning, or flash of missing content

### PF3 — Auto-categorize still resolves correctly after the pre-index change
- **Given** an account with an established category-mapping history
- **When** importing a CSV where most descriptions exactly match previously
  seen merchants, and a few are new/fuzzy variants
- **Then** every description that has an exact match is still tagged
  correctly, fuzzy matches (e.g. "NETFLIX.COM" against a saved "netflix"
  mapping) still resolve the same as before, and the import completes
  noticeably faster on a large file than it would scanning every mapping
  per row

---

## Button sweeps (standing practice — rule 7)

A sweep means clicking every interactive control on a page or surface and
confirming each one actually does what it claims — not just the one thing a
bug report named or a new feature added. Run one:

- **When a bug report names a specific button.** The "Add your own" bug
  (below) is the reason this is a rule: the reported button had a second,
  unreported bug that only surfaced because the fix was checked live and the
  sweep kept going instead of stopping at the one repro.
- **Before calling a multi-control feature tested.** If a change adds more
  than one clickable thing to a page, click all of them, not just the
  primary action.

**What to check per control:** the click actually fires (not just "looks
right" — verify a real network request or state change, since a handler can
be silently wired to the wrong callback); the result matches what the label
promises; a second click in immediate succession doesn't collide, race, or
duplicate; destructive actions confirm before committing; disabled/pending
states actually block input rather than just looking greyed out.

### Swept so far

- [x] **Plan page** (2026-08-04) — Add your own (Investments + Savings),
  line-item delete, exclude/include toggle, Miscellaneous remove, Lock/Unlock
  plan, Notes expand/collapse. See "Add your own" below for the bug this
  caught. Drag-to-reorder was read, not click-tested (gesture-based).
- [ ] Transactions page — bulk-select/delete covered under "Bulk delete
  transactions" below; Import CSV, Add Transaction, Filters,
  Auto-Categorize, Reset Plan, and the category/type/account dropdowns have
  been exercised incidentally while building other features, not swept as
  their own pass.
- [ ] Budget page — built and functionally tested during development, not
  swept as a dedicated pass.
- [ ] Auth pages (login, register, forgot-password) — thoroughly exercised
  during the password-reset hardening, but that was scenario-driven
  (AR1–AR5 below), not an exhaustive click-through of every control.
- [ ] Dashboard
- [ ] Preview & Export
- [ ] Profile / account settings

---

## Backlog — untested areas

Rule 2 says to close these out as the areas are touched.

- [ ] CSV import: parsing, the amount-sign convention, duplicate detection
- [ ] Auto-categorization and `CategoryMapping` memory
- [ ] Excel export contents and formatting
- [ ] Auth: registration, login, refresh, session timeout (password reset covered above)
- [ ] Plan lock/unlock and its effect on category edits
- [ ] Net worth trend and savings-rate dashboard charts
- [ ] Line-item reorder (drag and drop)
