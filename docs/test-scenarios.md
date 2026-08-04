# Test scenarios

Manual walkthroughs to pair with the automated suite (`pnpm test`). Rule 2 of
[`CLAUDE.md`](../CLAUDE.md) requires every feature to have both.

Each scenario is given / when / then. Run them against a **disposable**
database, never a deployed one.

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
- **Given** a fixed-cost or savings line
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

## Backlog — untested areas

Rule 2 says to close these out as the areas are touched.

- [ ] CSV import: parsing, the amount-sign convention, duplicate detection
- [ ] Auto-categorization and `CategoryMapping` memory
- [ ] Excel export contents and formatting
- [ ] Auth: registration, login, refresh, session timeout (password reset covered above)
- [ ] Plan lock/unlock and its effect on category edits
- [ ] Net worth trend and savings-rate dashboard charts
- [ ] Line-item reorder (drag and drop)
