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
    body: "Enter your net worth and income up top. Fixed costs fill in from your categorized transactions; investments and savings are your goals.",
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
    body: "Upload a bank/credit-card export — or download our template first. Imported rows are auto-categorized in the background.",
  },
  {
    selector: '[data-tour="tx-filters"]',
    title: "Filter what you see",
    body: "Narrow by search, date, category, account type, or status (categorized, uncategorized, duplicates).",
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
