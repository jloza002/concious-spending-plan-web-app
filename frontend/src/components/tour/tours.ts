import type { TourStep } from "./guided-tour";

export const PLANS_TOUR: TourStep[] = [
  {
    title: "Welcome to your plans",
    body: "Each card is one month's Conscious Spending Plan. This quick tour points out the essentials — you can skip anytime.",
  },
  {
    selector: '[data-tour="new-plan"]',
    title: "Create a monthly plan",
    body: "Start a new month here. New plans carry over your income and savings/investment goals from the previous month automatically.",
  },
  {
    selector: '[data-tour="nav-dashboard"]',
    title: "Track trends",
    body: "Once you lock a few months, the Dashboard charts your net worth, savings rate, and spending over time.",
  },
  {
    selector: '[data-tour="nav-help"]',
    title: "Need a hand?",
    body: "The full written guide lives here and is always available — even before you sign in.",
  },
];

export const PLAN_TOUR: TourStep[] = [
  {
    title: "This is a monthly plan",
    body: "Enter your net worth up top. Fixed costs fill in from your categorized transactions; investments and savings are your goals.",
  },
  {
    title: "Net income can fill itself in too",
    body: "Tag a deposit — a paycheck, a Zelle you received — as Income on the Transactions tab, and Net Monthly Income switches from a manual field to an automatic total. With nothing tagged yet, it stays exactly as editable as before.",
  },
  {
    selector: '[data-tour="exclude-line"]',
    title: "Exclude a line to explore",
    body: "Click the eye icon on any fixed-cost or savings line to exclude it. The line goes transparent and drops out of that section's total (and your guilt-free budget updates) — a quick way to see 'what if I cut this?'. Click again to include it.",
  },
  {
    selector: '[data-tour="plan-lock"]',
    title: "Lock when you're done",
    body: "Locking finalizes the month, adds it to your dashboard, and protects it from later category changes. You can unlock anytime.",
  },
];

export const TRANSACTIONS_TOUR: TourStep[] = [
  {
    title: "Import & categorize",
    body: "This is where money movement becomes your plan. Import transactions, then assign each a category.",
  },
  {
    selector: '[data-tour="tx-import"]',
    title: "Import a CSV",
    body: "Upload a bank/credit-card export — or download our template first. In the import dialog you can set the account type and tell us whether purchases are shown as negative or positive (or split Debit/Credit), so amounts are read correctly. Imported rows are auto-categorized instantly.",
  },
  {
    selector: '[data-tour="tx-filters"]',
    title: "Filter what you see",
    body: "Narrow by search, date, category, account type, or status (categorized, uncategorized, duplicates).",
  },
  {
    title: "Deposits can be tagged Income",
    body: "Open a deposit's category dropdown and you'll see an Income group alongside Fixed Costs — direction decides eligibility, so this only shows up for positive amounts. Tag paychecks, Zelle transfers, or side income there and your plan's Net Monthly Income starts calculating itself.",
  },
];

export const DASHBOARD_TOUR: TourStep[] = [
  {
    title: "Your dashboard",
    body: "Everything here reflects your locked plans. Lock a month on its plan page to make it appear.",
  },
  {
    selector: '[data-tour="dash-period"]',
    title: "Pick a time range",
    body: "Switch between a single month, a full year, or all-time. The KPIs and charts update to match.",
  },
  {
    selector: '[data-tour="dash-kpis"]',
    title: "Headline numbers",
    body: "Net worth, savings rate, fixed-cost share, and guilt-free budget — aggregated for the range you chose.",
  },
];
