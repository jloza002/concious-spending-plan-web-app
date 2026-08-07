import type { Metadata } from "next";
import Link from "next/link";
import {
  WorkflowFigure,
  CreatePlanFigure,
  NetWorthFigure,
  IncomeLinkFigure,
  FixedCostsFigure,
  BudgetFigure,
  TransactionsFigure,
  CsvTemplateFigure,
  DuplicatesFigure,
  LockFigure,
  DashboardFigure,
  NotesFigure,
} from "@/components/help/illustrations";

export const metadata: Metadata = {
  title: "Help & Documentation — Conscious Spending Plan",
  description:
    "Full guide to using the Conscious Spending Plan app: creating plans, importing transactions, categorizing, locking plans, and reading your dashboard.",
};

const SECTIONS = [
  { id: "getting-started", title: "Getting started" },
  { id: "creating-a-plan", title: "Creating a plan" },
  { id: "net-worth-income", title: "Net worth & income" },
  { id: "income-linkage", title: "Linking deposits to income" },
  { id: "fixed-costs", title: "Fixed costs & categories" },
  { id: "budget", title: "Setting a budget" },
  { id: "transactions", title: "Transactions & importing" },
  { id: "csv-template", title: "The CSV template" },
  { id: "duplicates", title: "Duplicates & account types" },
  { id: "locking", title: "Locking a plan" },
  { id: "dashboard", title: "The dashboard" },
  { id: "notes", title: "Notes" },
  { id: "faq", title: "Tips & FAQ" },
];

function Section({
  id,
  title,
  figure,
  children,
}: {
  id: string;
  title: string;
  figure?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-gray-700">{children}</div>
      {figure && <figure className="mt-4 max-w-xl">{figure}</figure>}
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)]">
      {/* Header */}
      <header className="bg-[var(--color-dark-teal)] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-lg font-bold hover:opacity-80">CSP</Link>
          <div className="flex items-center gap-4 text-sm font-sans">
            <Link href="/login" className="text-white/80 hover:text-white">Sign in</Link>
            <Link
              href="/plans"
              className="bg-[var(--color-orange)] text-white px-3 py-1.5 rounded-lg hover:opacity-90"
            >
              Open the app
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Hero */}
        <div className="mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--color-dark-teal)] mb-3">
            How to use the Conscious Spending Plan
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl">
            This app turns the <em>I Will Teach You To Be Rich</em> Conscious Spending Plan into a living
            monthly tool: import your transactions, see exactly where your money goes, and keep fixed costs,
            investments, savings, and guilt-free spending in balance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8 lg:gap-12">
          {/* Table of contents */}
          <nav className="lg:sticky lg:top-8 self-start">
            <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold mb-2 font-sans">On this page</p>
            <ul className="space-y-1.5">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="text-sm text-gray-600 hover:text-[var(--color-orange)] font-sans">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="space-y-10 min-w-0">
            <Section id="getting-started" title="Getting started" figure={<WorkflowFigure />}>
              <p>
                After you sign in, you land on your <strong>Plans</strong> page — one card per month. The
                workflow each month is simple:
              </p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Create (or open) the plan for the month.</li>
                <li>Enter your net worth and income.</li>
                <li>Import your bank/credit-card transactions from a CSV.</li>
                <li>Categorize the transactions (the app auto-suggests categories it has learned).</li>
                <li>Review the breakdown, then <strong>lock</strong> the plan to finalize it and add it to your dashboard.</li>
              </ol>
            </Section>

            <Section id="creating-a-plan" title="Creating a plan" figure={<CreatePlanFigure />}>
              <p>
                On the Plans page, choose a month and year and create the plan. When a previous month exists,
                the new plan automatically <strong>carries over your gross / net income and your investment and
                savings goals</strong> from the most recent prior month, so you only adjust what changed.
              </p>
              <p>
                Fixed-cost categories are not carried as amounts — they are filled in from your real
                transactions once you import and categorize them.
              </p>
            </Section>

            <Section id="net-worth-income" title="Net worth & income" figure={<NetWorthFigure />}>
              <p>
                At the top of a plan, enter your <strong>assets, investments, savings, and debt</strong> to
                track net worth, and your <strong>gross and net monthly income</strong>. Net income is the
                number every percentage on the plan is measured against (fixed costs %, savings %, guilt-free %).
              </p>
            </Section>

            <Section id="income-linkage" title="Linking deposits to income" figure={<IncomeLinkFigure />}>
              <p>
                Net Monthly Income doesn&apos;t have to be typed in by hand. On the <strong>Transactions</strong>{" "}
                tab, any <strong>deposit</strong> (a positive-amount transaction — a paycheck, a Zelle you
                received, a reimbursement) can be tagged with an <strong>Income</strong> category, the same way
                an expense gets tagged Fixed Costs. As soon as one deposit is tagged, Net Monthly Income switches
                from a manual field to an <strong>automatic total</strong>{" "}of everything you&apos;ve tagged that
                month, and every percentage on the plan (Fixed Costs %, Savings %, Guilt-Free %) recalculates
                against it.
              </p>
              <p>
                <strong>Direction decides eligibility, not payment method.</strong> A Zelle you <em>received</em>{" "}
                is a deposit — tag it Income. A Zelle you <em>sent</em>{" "}is an expense — it stays in Fixed Costs
                (or whichever category fits) exactly as before. The Income group in the category dropdown only
                appears for positive-amount transactions, so there&apos;s no confusing the two.
              </p>
              <p>
                Income categories are managed the same way Fixed Costs categories are — add, rename, or delete
                your own from the dropdown&apos;s <em>Edit categories</em> mode — but the <strong>Income
                section itself</strong>{" "}is a fixed part of the app and can&apos;t be renamed or removed.
              </p>
              <p>
                If nothing is tagged Income yet, Net Monthly Income stays exactly as editable as it always
                was — this only changes anything once you start tagging deposits.
              </p>
            </Section>

            <Section id="fixed-costs" title="Fixed costs & categories" figure={<FixedCostsFigure />}>
              <p>
                Fixed costs (rent, utilities, groceries, subscriptions, etc.) are driven by your transactions.
                The Fixed Costs section on the plan shows <strong>only the categories that have categorized
                transactions</strong>{" "}— it won&apos;t clutter the view with empty categories.
              </p>
              <p>
                A <strong>Miscellaneous</strong> buffer of 15% is added automatically on top of your fixed
                costs (you can remove it for a month with the ✕). You can drag fixed-cost rows to reorder them.
              </p>
              <p>
                You manage the master list of categories from the transaction <strong>category dropdown</strong>{" "}
                (see below). Categories are personal to your account and shared across your plans.
              </p>
              <p>
                <strong>Excluding a line (what-if):</strong>{" "}click the eye icon on any Fixed Costs, Investments,
                or Savings line to exclude it. The line turns transparent and drops out of that section&apos;s total, so your
                guilt-free budget updates immediately — handy for testing &quot;what if I cut this category?&quot;.
                Click the icon again to include it. Exclusions are saved on the plan and don&apos;t delete anything.
              </p>
            </Section>

            <Section id="budget" title="Setting a budget" figure={<BudgetFigure />}>
              <p>
                The <strong>Budget</strong>{" "}
                page is where you set spending targets — separate from Fixed
                Costs, which only shows what you&apos;ve actually spent. Pick up to <strong>10 fixed-cost
                categories</strong> for the month and enter what you plan to spend on each. Changes save
                automatically.
              </p>
              <p>
                Once a month has a budget, your plan&apos;s Fixed Costs section gains{" "}
                <strong>Planned</strong> and <strong>Over / Under</strong>{" "}
                columns next to Actual, and the
                Dashboard&apos;s &ldquo;Spending vs Plan&rdquo; chart compares the two. A category you
                budgeted but haven&apos;t spent on yet still shows up — it used to be hidden until you spent
                something.
              </p>
              <p>
                Each month&apos;s budget is independent, so the categories and amounts you track in August
                don&apos;t have to match September. If a month is empty and the previous one has a budget, a{" "}
                <strong>Copy last month&apos;s budget</strong> button appears to carry it forward as a
                starting point.
              </p>
              <p>
                Deleting a category from your library removes it from future budgeting, but any month you
                already budgeted it for keeps showing that history — nothing you&apos;ve tracked disappears.
              </p>
            </Section>

            <Section id="transactions" title="Transactions & importing" figure={<TransactionsFigure />}>
              <p>
                Open a plan&apos;s <strong>Transactions</strong> tab to import and categorize spending.
                Click <strong>Import CSV</strong> and drop in a file exported from your bank, or use our
                template (next section).
              </p>
              <p>
                Each transaction has a <strong>category</strong> dropdown. Click <em>Edit categories</em> inside
                it to add, rename, or delete categories. Renames and deletes apply to your current plan and any
                other <em>unlocked</em> plans; locked plans are never changed.
              </p>
              <p>
                In the import dialog you can set the <strong>account type</strong> for the whole batch (Credit
                Card / Checking / Savings) and tell the app <strong>how amounts are shown</strong> in your file:
                purchases as negative (e.g. Chase), purchases as positive, or a separate Debit / Credit column
                layout. The preview marks income rows green with a <span className="text-green-600 font-medium">+</span>{" "}
                so you can confirm before importing. Your choice is remembered per account type.
              </p>
              <p>
                The app <strong>auto-categorizes</strong> imported transactions using what it has learned from
                your past choices — this happens server-side during import, so rows come back already categorized.
              </p>
              <p>
                Use the <strong>Filters</strong> button to search by description, date range, category, account
                type, or status (all / categorized / uncategorized / duplicates). <strong>Reset Plan</strong>{" "}
                permanently deletes all transactions in the plan.
              </p>
              <p>
                To clean up several rows at once — duplicates, a bad import, anything — tick the checkbox
                on each one, or use the checkbox in the table header to select everything currently shown
                (if you&apos;re filtered to a search or date range, that selects only the filtered rows).
                A bar appears with a count and a <strong>Delete Selected</strong> button. Like deleting one
                row at a time, this is not permanent — the rows move to Deleted Transactions below, where
                you can restore any of them individually.
              </p>
            </Section>

            <Section id="csv-template" title="The CSV template" figure={<CsvTemplateFigure />}>
              <p>
                Inside the import dialog, click <strong>Download template</strong> to get a correctly formatted
                CSV. Fill in your transactions and re-upload. The template columns are:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Transaction Date</strong> — e.g. <code className="bg-gray-100 px-1 rounded">2026-06-14</code> or <code className="bg-gray-100 px-1 rounded">06/14/2026</code></li>
                <li><strong>Post Date</strong> — optional; defaults to the transaction date</li>
                <li><strong>Description</strong> — the merchant or payee</li>
                <li><strong>Category</strong> — optional original category from your bank</li>
                <li><strong>Type</strong> — Sale, Return, Payment, Adjustment, Debit, or Credit</li>
                <li><strong>Amount</strong> — negative for spending, positive for income / refunds. If your bank does it the other way around, pick the matching option in the import dialog and the app flips it for you.</li>
                <li><strong>Account Type</strong> — Credit Card, Checking Account, or Savings Account</li>
                <li><strong>Memo</strong> — optional note</li>
              </ul>
              <p>
                The importer is flexible about column names from common banks, but the template guarantees a
                clean import.
              </p>
            </Section>

            <Section id="duplicates" title="Duplicates & account types" figure={<DuplicatesFigure />}>
              <p>
                Duplicate detection is <strong>scoped to the current plan only</strong>. If a transaction with
                the same date, description, and amount already exists in <em>this</em> plan, the import dialog
                flags it. Importing the same transactions that live in a <em>different</em>{" "}month&apos;s plan will
                <strong> not</strong> flag them.
              </p>
              <p>
                In the review dialog you can <strong>tick individual duplicates to import</strong> them anyway,
                or use <strong>Import all</strong> / <strong>Skip all</strong>. Then confirm — the dialog closes
                as soon as the rows are saved.
              </p>
              <p>
                Every import asks you to <strong>choose an account type</strong> before the Import button
                unlocks — a specific account type (Credit Card / Checking / Savings) applies to every row, or
                pick <strong>&quot;Use each row&apos;s value from the file&quot;</strong>{" "}if your CSV already has an
                Account Type column (a combined-account export, for example). Choosing that option shows a
                heads-up if some rows don&apos;t specify one — it won&apos;t block the import, just flag them so
                you can set them individually afterward. The account can always be edited inline per
                transaction later, and you can filter by it.
              </p>
            </Section>

            <Section id="locking" title="Locking a plan" figure={<LockFigure />}>
              <p>
                When a month is finished, open the plan and click <strong>Lock plan</strong>. Locking does two
                things:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>It <strong>adds the plan to your dashboard</strong> (only locked plans appear there).</li>
                <li>It <strong>protects the plan</strong> from library-wide category renames and deletes, so your
                  history stays exactly as it was.</li>
              </ul>
              <p>
                You can <strong>Unlock</strong>{" "}any time to edit again. A pill on the plan shows whether it&apos;s a
                <em> Draft</em> or <em>Locked &amp; on dashboard</em>.
              </p>
            </Section>

            <Section id="dashboard" title="The dashboard" figure={<DashboardFigure />}>
              <p>
                The Dashboard summarizes your <strong>locked</strong> plans. Pick any month from the dropdown, and
                switch the time range with <strong>Month / Year / All-time</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Net Worth</strong> — the value at the latest month in the range.</li>
                <li><strong>Savings + Investments</strong> and <strong>Fixed Costs Share</strong> — averaged across the range.</li>
                <li><strong>Guilt-Free Budget</strong> — the total for the range.</li>
              </ul>
              <p>
                The trend charts (net worth, savings rate, income) plot every locked month in the range. Click a
                point to jump straight to that plan.
              </p>
              <p>
                Below the trends, <strong>Spending vs Plan</strong>, <strong>Top Movers</strong>, and the{" "}
                <strong>fixed costs pie chart</strong>{" "}all follow the same time range now — switch to Year or
                All-time and they sum across every locked plan in it, not just the selected month. Top Movers
                compares against the prior locked month (Month view) or the prior calendar year (Year view); in
                All-time view there&apos;s no natural &quot;prior&quot; period, so it says so instead of guessing.
                In the pie chart, click a slice in Month view to jump straight to those transactions; in Year or
                All-time view, clicking highlights the slice instead, since there&apos;s no single plan to open.
              </p>
            </Section>

            <Section id="notes" title="Notes" figure={<NotesFigure />}>
              <p>
                Every plan has a rich-text <strong>Notes</strong> section with a formatting toolbar — headings,
                bold, italic, underline, strikethrough, and bulleted, numbered, or lettered lists. Use it for
                context you want to remember about the month.
              </p>
            </Section>

            <Section id="faq" title="Tips & FAQ">
              <p><strong>My imported transactions didn&apos;t appear right away.</strong> They save first, then
                auto-categorize in the background. If a list ever looks stale, refresh — your data is safe.</p>
              <p><strong>A category I deleted keeps coming back.</strong>{" "}Deleting a category also clears the
                memory keywords tied to it, so it won&apos;t be re-applied to future imports.</p>
              <p><strong>Why is a plan missing from the dashboard?</strong> Only locked plans appear. Open it and
                click <em>Lock plan</em>.</p>
              <p><strong>Why was I signed out?</strong>{" "}For security, your session ends after about an hour of
                inactivity. You&apos;ll get a &quot;Still there?&quot; warning with a countdown first — click
                <em> Stay signed in</em> to continue. If it lapses, just sign in again.</p>
              <p><strong>Is my data private?</strong> Your categories, plans, and transactions are tied to your
                account and are not visible to other users.</p>
              <p><strong>I tagged a deposit Income but Net Monthly Income didn&apos;t change.</strong> Give it a
                moment to refresh, or check that you tagged a <em>positive</em>-amount row — negative amounts (money
                going out) can&apos;t be tagged Income. Untagging the last income transaction reverts to the
                manual field.</p>
              <p><strong>Why can&apos;t I click Import anymore?</strong>{" "}An account type is now required before
                every import. Pick a specific one, or &quot;Use each row&apos;s value from the file&quot; if your
                CSV already specifies it per row.</p>
            </Section>

            <div className="pt-6 border-t border-gray-200">
              <Link
                href="/plans"
                className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-orange)] text-white font-medium rounded-lg hover:opacity-90 font-sans"
              >
                Open the app →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
