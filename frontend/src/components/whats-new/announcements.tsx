import type { ReactNode } from "react";

export interface Announcement {
  /**
   * Stable id, stored per account once dismissed. Never reuse one — changing
   * the id is how you re-show a revised announcement.
   */
  id: string;
  title: string;
  /** One or two short sentences, written from the user's side of the screen. */
  body: string;
  /** Where the feature lives, if it has a page of its own. */
  cta?: { label: string; href: string };
  /** Small inline illustration of the feature. */
  graphic: ReactNode;
}

const TEAL = "var(--color-dark-teal)";
const ORANGE = "var(--color-orange)";
const BEIGE = "var(--color-warm-beige)";

/**
 * A miniature of the Fixed Costs table: category, planned, actual, and the
 * over/under chip — the thing the Budget feature actually adds.
 */
function BudgetGraphic() {
  const rows: { label: string; planned: string; actual: string; chip: string; tone: "over" | "under" | "even" }[] = [
    { label: "Rent", planned: "$2,100", actual: "$2,100", chip: "even", tone: "even" },
    { label: "Groceries", planned: "$650", actual: "$712", chip: "+$62", tone: "over" },
    { label: "Insurance", planned: "$220", actual: "—", chip: "−$220", tone: "under" },
  ];

  const chipStyles: Record<string, string> = {
    over: "bg-red-50 text-red-700",
    under: "bg-green-50 text-green-700",
    even: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white" aria-hidden>
      <div
        className="px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-white"
        style={{ background: TEAL }}
      >
        Fixed Costs
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border-b border-gray-100
        text-[9px] font-sans font-bold uppercase tracking-wider text-gray-400">
        <span className="flex-1">Category</span>
        <span className="w-12 text-right">Planned</span>
        <span className="w-12 text-right">Actual</span>
        <span className="w-14 text-right">Over / Under</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-b-0"
        >
          <span className="flex-1 text-[11px] font-sans text-gray-800 truncate">{row.label}</span>
          <span className="w-12 text-right text-[11px] font-sans tabular-nums text-gray-500">
            {row.planned}
          </span>
          <span className="w-12 text-right text-[11px] font-sans tabular-nums font-semibold text-gray-900">
            {row.actual}
          </span>
          <span className="w-14 flex justify-end">
            <span
              className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded-full tabular-nums ${chipStyles[row.tone]}`}
            >
              {row.chip}
            </span>
          </span>
        </div>
      ))}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-sans font-bold"
        style={{ background: BEIGE, color: TEAL }}
      >
        <span className="flex-1">BUDGETED TOTAL</span>
        <span className="tabular-nums">$2,970</span>
      </div>
      <div className="px-3 py-1.5 text-[10px] font-sans text-gray-400 border-t border-gray-100">
        <span style={{ color: ORANGE }}>●</span> Insurance is budgeted but unspent — it
        shows up now instead of disappearing.
      </div>
    </div>
  );
}

/**
 * A miniature of the transactions table with a couple of rows ticked and the
 * bulk-action bar that appears once anything is selected.
 */
function BulkDeleteGraphic() {
  const rows: { date: string; desc: string; checked: boolean }[] = [
    { date: "08/02", desc: "Whole Foods", checked: true },
    { date: "08/01", desc: "Old Navy — return", checked: true },
    { date: "07/30", desc: "Netflix", checked: false },
  ];

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white" aria-hidden>
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-bold"
        style={{ background: `${ORANGE}1A`, color: TEAL }}
      >
        <span>2 selected</span>
        <span className="px-2 py-0.5 rounded text-white" style={{ background: "#EF4444" }}>
          Delete Selected
        </span>
      </div>
      <div className="flex items-center gap-2 px-3 py-1 bg-gray-50 border-b border-gray-100
        text-[9px] font-sans font-bold uppercase tracking-wider text-gray-400">
        <span className="w-3" />
        <span className="w-9">Date</span>
        <span className="flex-1">Description</span>
      </div>
      {rows.map((row) => (
        <div
          key={row.desc}
          className={`flex items-center gap-2 px-3 py-1.5 border-b border-gray-50 last:border-b-0 ${
            row.checked ? "bg-orange-50/40" : ""
          }`}
        >
          <span
            className="w-3 h-3 rounded-sm border flex items-center justify-center text-[8px] font-bold shrink-0"
            style={{
              borderColor: row.checked ? ORANGE : "#D1D5DB",
              background: row.checked ? ORANGE : "transparent",
              color: "white",
            }}
          >
            {row.checked ? "✓" : ""}
          </span>
          <span className="w-9 text-[10px] font-sans text-gray-400">{row.date}</span>
          <span className="flex-1 text-[11px] font-sans text-gray-800 truncate">{row.desc}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A miniature of the Income section: a plain row, an auto-calculated
 * breakdown row, and the total — the before/after this feature adds.
 */
function IncomeLinkGraphic() {
  const rows = [
    { label: "Paycheck / Salary", amount: "$3,800" },
    { label: "Side Income", amount: "$500" },
  ];

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white" aria-hidden>
      <div
        className="px-3 py-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-white"
        style={{ background: TEAL }}
      >
        Income
      </div>
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-50">
        <span className="text-[11px] font-sans text-gray-800">Gross monthly income</span>
        <span className="text-[11px] font-sans tabular-nums text-gray-500">$5,200</span>
      </div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between px-3 py-1.5 border-b border-gray-50">
          <span className="text-[11px] font-sans text-gray-800 truncate">{row.label}</span>
          <span className="text-[11px] font-sans tabular-nums text-gray-900">{row.amount}</span>
        </div>
      ))}
      <div
        className="flex items-center justify-between px-3 py-1.5 text-[10px] font-sans font-bold"
        style={{ background: BEIGE, color: TEAL }}
      >
        <span>NET MONTHLY INCOME</span>
        <span className="tabular-nums">$4,300</span>
      </div>
      <div className="px-3 py-1.5 text-[10px] font-sans text-gray-400 border-t border-gray-100">
        <span style={{ color: ORANGE }}>●</span> Auto-calculated from your
        tagged income transactions.
      </div>
    </div>
  );
}

/**
 * A miniature donut chart plus a Month/Year/All-time pill — the two things
 * this batch actually adds to the dashboard (the pie chart, and every card
 * now following the period toggle instead of just the KPIs).
 */
function DashboardPieGraphic() {
  const slices: { label: string; value: number; color: string }[] = [
    { label: "Rent", value: 42, color: TEAL },
    { label: "Groceries", value: 22, color: ORANGE },
    { label: "Utilities", value: 14, color: "#0EA5E9" },
    { label: "Other", value: 22, color: BEIGE },
  ];
  const r = 26;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 bg-white p-3" aria-hidden>
      <div className="flex items-center gap-3">
        <svg viewBox="0 0 64 64" width="64" height="64" className="shrink-0">
          {slices.map((s) => {
            const dash = (s.value / 100) * circumference;
            const el = (
              <circle
                key={s.label}
                cx="32"
                cy="32"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="10"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 32 32)"
              />
            );
            offset += dash;
            return el;
          })}
        </svg>
        <div className="flex-1 space-y-0.5">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5 text-[10px] font-sans text-gray-600">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
              {s.label}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 inline-flex rounded-md overflow-hidden border border-gray-200 text-[9px] font-sans font-bold">
        <span className="px-2 py-1 text-gray-400">Month</span>
        <span className="px-2 py-1 text-white" style={{ background: TEAL }}>Year</span>
        <span className="px-2 py-1 text-gray-400">All-time</span>
      </div>
    </div>
  );
}

/**
 * Announcements shown once per account, newest first. Add an entry here when a
 * change gives users something new they can see and use.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "whats-new:dashboard-pie-and-account-type:v1",
    title: "A pie chart, and every dashboard card follows your date range",
    body:
      "The dashboard has a new fixed-costs pie chart — click a slice to jump to those transactions. Spending vs Plan and Top Movers now follow the Month/Year/All-time toggle too, instead of always showing just the selected month. Importing a CSV also now asks which account it's from, so nothing gets attributed to the wrong one.",
    cta: { label: "Open Dashboard", href: "/dashboard" },
    graphic: <DashboardPieGraphic />,
  },
  {
    id: "whats-new:income-linkage:v1",
    title: "Deposits can now fill in your income",
    body:
      "Tag a paycheck, a Zelle you received, or any other deposit as Income on the Transactions tab — a category just for money coming in. Once tagged, Net Monthly Income calculates itself, and every percentage on your plan updates to match.",
    graphic: <IncomeLinkGraphic />,
  },
  {
    id: "whats-new:bulk-delete-transactions:v1",
    title: "Delete several transactions at once",
    body:
      "Tick the checkboxes on the Transactions tab to select a batch of rows, then Delete Selected. They move to Deleted Transactions, same as deleting one at a time, so you can restore any of them if you select the wrong ones.",
    graphic: <BulkDeleteGraphic />,
  },
  {
    id: "whats-new:budget:v1",
    title: "Set a budget for each month",
    body:
      "Pick up to 10 fixed-cost categories a month and say what you plan to spend. Your plan now shows planned against actual with how far over or under you are, and the dashboard's Spending vs Plan chart finally compares two different numbers.",
    cta: { label: "Open Budget", href: "/budget" },
    graphic: <BudgetGraphic />,
  },
];
