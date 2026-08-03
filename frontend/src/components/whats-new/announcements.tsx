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
 * Announcements shown once per account, newest first. Add an entry here when a
 * change gives users something new they can see and use.
 */
export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "whats-new:budget:v1",
    title: "Set a budget for each month",
    body:
      "Pick up to 10 fixed-cost categories a month and say what you plan to spend. Your plan now shows planned against actual with how far over or under you are, and the dashboard's Spending vs Plan chart finally compares two different numbers.",
    cta: { label: "Open Budget", href: "/budget" },
    graphic: <BudgetGraphic />,
  },
];
