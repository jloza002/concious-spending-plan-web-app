/**
 * App-styled SVG mockups for the /help page. These are schematic illustrations
 * (not real screenshots) that mirror the app's layout and brand so the guide
 * stays accurate, self-contained, and free of real financial data.
 */
import type { ReactNode } from "react";

const TEAL = "#15302F";
const ORANGE = "#FB4D30";
const CREAM = "#F5EEE4";
const BEIGE = "#EEE3D2";
const BORDER = "#E5E5E5";
const GRAY = "#6B7280";
const DARK = "#1F2937";
const GREEN = "#16A34A";

const FONT = "'DM Sans', system-ui, sans-serif";

function Frame({ viewBox, label, children }: { viewBox: string; label: string; children: ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className="w-full h-auto rounded-xl border border-gray-200 shadow-sm bg-white"
      style={{ fontFamily: FONT }}
    >
      <title>{label}</title>
      {children}
    </svg>
  );
}

/* 1 — Getting started: 5-step vertical workflow */
export function WorkflowFigure() {
  const steps = [
    "Create or open the month's plan",
    "Enter your net worth and income",
    "Import your transactions (CSV)",
    "Categorize each transaction",
    "Review, then lock the plan",
  ];
  return (
    <Frame viewBox="0 0 460 230" label="The five-step monthly workflow">
      <rect x="0" y="0" width="460" height="230" fill={CREAM} />
      {steps.map((s, i) => {
        const y = 24 + i * 40;
        return (
          <g key={i}>
            {i < steps.length - 1 && <line x1="34" y1={y + 14} x2="34" y2={y + 40} stroke={ORANGE} strokeWidth="2" opacity="0.35" />}
            <circle cx="34" cy={y} r="14" fill={ORANGE} />
            <text x="34" y={y + 5} textAnchor="middle" fontSize="15" fontWeight="700" fill="#fff">{i + 1}</text>
            <rect x="60" y={y - 15} width="376" height="30" rx="8" fill="#fff" stroke={BORDER} />
            <text x="74" y={y + 5} fontSize="14" fill={DARK}>{s}</text>
          </g>
        );
      })}
    </Frame>
  );
}

/* 2 — Create plan modal */
export function CreatePlanFigure() {
  return (
    <Frame viewBox="0 0 460 250" label="The New Spending Plan dialog">
      <rect x="0" y="0" width="460" height="250" fill={TEAL} opacity="0.08" />
      <rect x="70" y="24" width="320" height="202" rx="14" fill={CREAM} stroke={BORDER} />
      <rect x="70" y="24" width="320" height="44" rx="14" fill={TEAL} />
      <rect x="70" y="44" width="320" height="24" fill={TEAL} />
      <text x="90" y="52" fontSize="15" fontWeight="700" fill={BEIGE}>New Spending Plan</text>
      <text x="368" y="52" fontSize="15" fill={BEIGE} opacity="0.7">✕</text>

      <text x="90" y="96" fontSize="12" fill={GRAY}>Month</text>
      <rect x="90" y="104" width="280" height="34" rx="8" fill="#fff" stroke={BORDER} />
      <text x="104" y="126" fontSize="13" fill={DARK}>June</text>
      <text x="350" y="126" fontSize="11" fill={GRAY}>▾</text>

      <text x="90" y="160" fontSize="12" fill={GRAY}>Year</text>
      <rect x="90" y="168" width="280" height="34" rx="8" fill="#fff" stroke={BORDER} />
      <text x="104" y="190" fontSize="13" fill={DARK}>2026</text>

      <rect x="280" y="210" width="90" height="0" />
      <rect x="284" y="206" width="86" height="0" />
    </Frame>
  );
}

/* 3 — Net worth & income inputs */
export function NetWorthFigure() {
  const rows: [string, string][] = [
    ["Assets", "$42,000"],
    ["Investments", "$18,500"],
    ["Savings", "$9,200"],
    ["Debt", "$6,400"],
  ];
  return (
    <Frame viewBox="0 0 460 230" label="Net worth and income inputs">
      <rect x="0" y="0" width="460" height="230" fill="#fff" />
      <rect x="16" y="16" width="428" height="34" rx="8" fill={TEAL} />
      <text x="32" y="38" fontSize="14" fontWeight="700" fill={BEIGE}>NET WORTH</text>
      {rows.map(([label, val], i) => {
        const y = 64 + i * 32;
        return (
          <g key={i}>
            <text x="32" y={y + 6} fontSize="13" fill={DARK}>{label}</text>
            <rect x="300" y={y - 12} width="128" height="26" rx="6" fill="#fff" stroke={BORDER} />
            <text x="418" y={y + 5} textAnchor="end" fontSize="13" fill={DARK}>{val}</text>
          </g>
        );
      })}
      <line x1="16" y1="196" x2="444" y2="196" stroke={BORDER} />
      <text x="32" y="216" fontSize="13" fontWeight="700" fill={TEAL}>TOTAL NET WORTH</text>
      <text x="428" y="216" textAnchor="end" fontSize="13" fontWeight="700" fill={GREEN}>$63,300</text>
    </Frame>
  );
}

/* 4 — Fixed costs section */
export function FixedCostsFigure() {
  const rows: [string, string][] = [
    ["Rent", "$1,800"],
    ["Groceries", "$520"],
    ["Subscriptions", "$64"],
  ];
  return (
    <Frame viewBox="0 0 460 240" label="Fixed costs on a plan">
      <rect x="0" y="0" width="460" height="240" fill="#fff" />
      <rect x="16" y="16" width="428" height="40" rx="8" fill={TEAL} />
      <text x="32" y="40" fontSize="14" fontWeight="700" fill={BEIGE}>FIXED COSTS</text>
      <rect x="300" y="28" width="128" height="16" rx="8" fill="#fff" opacity="0.25" />
      <rect x="300" y="28" width="78" height="16" rx="8" fill={ORANGE} />
      <text x="392" y="41" fontSize="11" fill={BEIGE}>54%</text>
      {rows.map(([label, val], i) => {
        const y = 78 + i * 32;
        return (
          <g key={i}>
            <text x="32" y={y + 6} fontSize="13" fill={DARK}>{label}</text>
            <rect x="320" y={y - 12} width="108" height="26" rx="6" fill="#fff" stroke={BORDER} />
            <text x="418" y={y + 5} textAnchor="end" fontSize="13" fill={DARK}>{val}</text>
          </g>
        );
      })}
      <rect x="16" y="170" width="428" height="30" fill="#F9FAFB" />
      <text x="32" y="189" fontSize="12" fontStyle="italic" fill={GRAY}>Miscellaneous (automatically adds 15%)</text>
      <text x="418" y="189" textAnchor="end" fontSize="12" fontStyle="italic" fill={GRAY}>$358</text>
      <line x1="16" y1="208" x2="444" y2="208" stroke={BORDER} />
      <text x="32" y="228" fontSize="13" fontWeight="700" fill={TEAL}>FIXED COSTS TOTAL</text>
      <text x="428" y="228" textAnchor="end" fontSize="13" fontWeight="700" fill={ORANGE}>$2,742</text>
    </Frame>
  );
}

/* Budget page: category picker + planned vs actual with an over/under chip */
export function BudgetFigure() {
  const rows: [string, string, string, string, "over" | "under" | "even"][] = [
    ["Rent", "$2,100", "$2,100", "even", "even"],
    ["Groceries", "$650", "$712", "+$62", "over"],
    ["Insurance", "$220", "—", "−$220", "under"],
  ];
  const chipFill: Record<string, string> = { over: "#FEE2E2", under: "#DCFCE7", even: "#F3F4F6" };
  const chipText: Record<string, string> = { over: "#B91C1C", under: "#15803D", even: GRAY };

  return (
    <Frame viewBox="0 0 460 240" label="Budget page: planned vs actual with an over/under chip">
      <rect x="0" y="0" width="460" height="240" fill="#fff" />
      <rect x="16" y="16" width="428" height="40" rx="8" fill={TEAL} />
      <text x="32" y="40" fontSize="14" fontWeight="700" fill={BEIGE}>AUGUST 2026 BUDGET</text>
      <rect x="360" y="26" width="68" height="20" rx="10" fill={BEIGE} />
      <text x="394" y="40" textAnchor="middle" fontSize="10" fontWeight="700" fill={TEAL}>4 / 10</text>

      <text x="32" y="76" fontSize="10" fontWeight="700" fill={GRAY}>CATEGORY</text>
      <text x="290" y="76" textAnchor="end" fontSize="10" fontWeight="700" fill={GRAY}>PLANNED</text>
      <text x="350" y="76" textAnchor="end" fontSize="10" fontWeight="700" fill={GRAY}>ACTUAL</text>
      <text x="428" y="76" textAnchor="end" fontSize="10" fontWeight="700" fill={GRAY}>OVER / UNDER</text>

      {rows.map(([label, planned, actual, chip, tone], i) => {
        const y = 100 + i * 34;
        return (
          <g key={i}>
            <text x="32" y={y + 6} fontSize="13" fill={DARK}>{label}</text>
            <text x="290" y={y + 6} textAnchor="end" fontSize="12" fill={GRAY}>{planned}</text>
            <text x="350" y={y + 6} textAnchor="end" fontSize="13" fontWeight="600" fill={DARK}>{actual}</text>
            <rect x="368" y={y - 13} width="60" height="20" rx="10" fill={chipFill[tone]} />
            <text x="398" y={y + 1} textAnchor="middle" fontSize="10" fontWeight="700" fill={chipText[tone]}>{chip}</text>
          </g>
        );
      })}

      <line x1="16" y1="206" x2="444" y2="206" stroke={BORDER} />
      <text x="32" y="226" fontSize="11" fontStyle="italic" fill={GRAY}>
        Insurance is budgeted but unspent — it shows up now instead of disappearing.
      </text>
    </Frame>
  );
}

/* 5 — Transactions table with open category dropdown */
export function TransactionsFigure() {
  const rows = [
    ["06-03", "Whole Foods", "Sale", "$58.20"],
    ["06-04", "Shell Gas", "Sale", "$41.10"],
    ["06-05", "Spotify", "Sale", "$10.99"],
  ];
  return (
    <Frame viewBox="0 0 460 240" label="The transactions table and category dropdown">
      <rect x="0" y="0" width="460" height="240" fill="#fff" />
      <rect x="12" y="12" width="436" height="28" fill={TEAL} />
      <text x="24" y="30" fontSize="11" fontWeight="700" fill={BEIGE}>Date</text>
      <text x="92" y="30" fontSize="11" fontWeight="700" fill={BEIGE}>Description</text>
      <text x="250" y="30" fontSize="11" fontWeight="700" fill={BEIGE}>Type</text>
      <text x="324" y="30" fontSize="11" fontWeight="700" fill={BEIGE}>Amount</text>
      <text x="392" y="30" fontSize="11" fontWeight="700" fill={BEIGE}>Category</text>
      {rows.map((r, i) => {
        const y = 40 + i * 30;
        return (
          <g key={i}>
            <rect x="12" y={y} width="436" height="30" fill={i % 2 ? CREAM : "#fff"} />
            <text x="24" y={y + 19} fontSize="11" fill={GRAY}>{r[0]}</text>
            <text x="92" y={y + 19} fontSize="11" fill={DARK}>{r[1]}</text>
            <text x="250" y={y + 19} fontSize="11" fill={GRAY}>{r[2]}</text>
            <text x="356" y={y + 19} textAnchor="end" fontSize="11" fill={DARK}>{r[3]}</text>
            <rect x="380" y={y + 6} width="60" height="18" rx="4" fill="#fff" stroke={BORDER} />
          </g>
        );
      })}
      {/* open dropdown on first row */}
      <rect x="320" y="62" width="124" height="96" rx="8" fill="#fff" stroke="#D1D5DB" strokeWidth="1.2" />
      <rect x="320" y="62" width="124" height="22" fill={CREAM} />
      <text x="330" y="77" fontSize="10" fill={DARK}>Groceries ✓</text>
      <text x="330" y="98" fontSize="10" fill={GRAY}>Rent</text>
      <text x="330" y="116" fontSize="10" fill={GRAY}>Eating Out</text>
      <line x1="320" y1="128" x2="444" y2="128" stroke={BORDER} />
      <text x="330" y="146" fontSize="10" fill={ORANGE}>✎ Edit categories</text>
    </Frame>
  );
}

/* 6 — CSV template grid */
export function CsvTemplateFigure() {
  const cols = ["Transaction Date", "Description", "Type", "Amount", "Account Type"];
  const data = [
    ["2026-06-03", "Whole Foods", "Sale", "-58.20", "Credit Card"],
    ["2026-06-04", "Paycheck", "Credit", "3200.00", "Checking Account"],
  ];
  const xs = [12, 110, 230, 290, 350];
  return (
    <Frame viewBox="0 0 460 150" label="The downloadable CSV template">
      <rect x="0" y="0" width="460" height="150" fill="#fff" />
      <rect x="12" y="14" width="436" height="28" fill={TEAL} opacity="0.9" />
      {cols.map((c, i) => (
        <text key={i} x={xs[i] + 6} y="32" fontSize="9.5" fontWeight="700" fill={BEIGE}>{c}</text>
      ))}
      {data.map((row, r) => (
        <g key={r}>
          <rect x="12" y={42 + r * 30} width="436" height="30" fill={r % 2 ? CREAM : "#fff"} />
          {row.map((cell, i) => (
            <text key={i} x={xs[i] + 6} y={62 + r * 30} fontSize="9.5" fill={DARK}>{cell}</text>
          ))}
        </g>
      ))}
      {/* column separators */}
      {xs.slice(1).map((x, i) => (
        <line key={i} x1={x - 6} y1="14" x2={x - 6} y2="102" stroke={BORDER} />
      ))}
      <text x="12" y="124" fontSize="11" fill={GRAY}>Amount is negative for spending, positive for income.</text>
    </Frame>
  );
}

/* 7 — Duplicate review modal */
export function DuplicatesFigure() {
  const rows = [
    ["06-03", "Whole Foods", "$58.20"],
    ["06-04", "Shell Gas", "$41.10"],
  ];
  return (
    <Frame viewBox="0 0 460 250" label="The duplicate review dialog">
      <rect x="0" y="0" width="460" height="250" fill={TEAL} opacity="0.08" />
      <rect x="40" y="18" width="380" height="214" rx="14" fill={CREAM} stroke={BORDER} />
      <rect x="40" y="18" width="380" height="40" rx="14" fill={TEAL} />
      <rect x="40" y="40" width="380" height="18" fill={TEAL} />
      <text x="58" y="44" fontSize="14" fontWeight="700" fill={BEIGE}>Import Transactions</text>
      <text x="58" y="80" fontSize="12" fill={DARK}>107 ready to import</text>
      <text x="170" y="80" fontSize="12" fill={ORANGE}>(2 possible duplicates)</text>
      <rect x="300" y="70" width="50" height="16" rx="0" fill="none" />
      <text x="300" y="80" fontSize="10" fill={TEAL} fontWeight="700">Import all</text>
      <text x="362" y="80" fontSize="10" fill={TEAL} fontWeight="700">Skip all</text>
      {rows.map((r, i) => {
        const y = 96 + i * 30;
        return (
          <g key={i}>
            <rect x="58" y={y} width="344" height="26" rx="6" fill="#fff" stroke={BORDER} />
            <rect x="66" y={y + 7} width="12" height="12" rx="3" fill="#fff" stroke="#9CA3AF" />
            <text x="90" y={y + 17} fontSize="11" fill={GRAY}>{r[0]}</text>
            <text x="140" y={y + 17} fontSize="11" fill={DARK}>{r[1]}</text>
            <rect x="250" y={y + 6} width="34" height="14" rx="4" fill="#FEF3C7" />
            <text x="256" y={y + 17} fontSize="9" fill="#B45309">DUP</text>
            <text x="392" y={y + 17} textAnchor="end" fontSize="11" fill={DARK}>{r[2]}</text>
          </g>
        );
      })}
      <rect x="312" y="194" width="90" height="26" rx="8" fill={ORANGE} />
      <text x="357" y="211" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Import 105</text>
    </Frame>
  );
}

/* 8 — Lock button states */
export function LockFigure() {
  return (
    <Frame viewBox="0 0 460 170" label="Locking a plan">
      <rect x="0" y="0" width="460" height="170" fill="#fff" />
      {/* Draft state */}
      <rect x="16" y="20" width="220" height="26" rx="13" fill="#F3F4F6" stroke={BORDER} />
      <circle cx="32" cy="33" r="4" fill="#F59E0B" />
      <text x="44" y="37" fontSize="11" fill={GRAY}>Draft — not on dashboard</text>
      <rect x="330" y="18" width="114" height="30" rx="8" fill={TEAL} />
      <text x="387" y="38" textAnchor="middle" fontSize="12" fontWeight="600" fill={BEIGE}>🔒 Lock plan</text>

      <line x1="16" y1="74" x2="444" y2="74" stroke={BORDER} strokeDasharray="3 3" />
      <text x="16" y="92" fontSize="10" fill={GRAY}>after locking…</text>

      {/* Locked state */}
      <rect x="16" y="104" width="226" height="26" rx="13" fill="#ECFDF5" stroke="#A7F3D0" />
      <text x="30" y="121" fontSize="11" fontWeight="600" fill="#047857">🔒 Locked &amp; on dashboard</text>
      <rect x="330" y="102" width="114" height="30" rx="8" fill="#fff" stroke="#D1D5DB" />
      <text x="387" y="122" textAnchor="middle" fontSize="12" fontWeight="600" fill={TEAL}>Unlock plan</text>
    </Frame>
  );
}

/* 9 — Dashboard KPIs + chart */
export function DashboardFigure() {
  const kpis = [["Net Worth", "$63k"], ["Savings", "22%"], ["Fixed", "54%"], ["Guilt-Free", "$840"]];
  const pts = [[20, 120], [110, 104], [200, 96], [290, 70], [380, 52]];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
  return (
    <Frame viewBox="0 0 460 250" label="The dashboard">
      <rect x="0" y="0" width="460" height="250" fill={CREAM} />
      {kpis.map((k, i) => {
        const x = 14 + i * 110;
        return (
          <g key={i}>
            <rect x={x} y="14" width="100" height="56" rx="10" fill="#fff" stroke={BORDER} />
            <text x={x + 12} y="36" fontSize="9.5" fill={GRAY}>{k[0]}</text>
            <text x={x + 12} y="56" fontSize="16" fontWeight="700" fill={TEAL}>{k[1]}</text>
          </g>
        );
      })}
      {/* chart card */}
      <rect x="14" y="84" width="432" height="150" rx="10" fill="#fff" stroke={BORDER} />
      <text x="28" y="106" fontSize="12" fontWeight="700" fill={TEAL}>Net Worth over time</text>
      <line x1="28" y1="210" x2="430" y2="210" stroke={BORDER} />
      <line x1="28" y1="120" x2="28" y2="210" stroke={BORDER} />
      <path d={`M28,210 ${path.replace("M", "L")} L380,210 Z`} fill={TEAL} opacity="0.08" transform="translate(0,90)" />
      <path d={path} fill="none" stroke={TEAL} strokeWidth="2.5" transform="translate(0,90)" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1] + 90} r="3.5" fill={ORANGE} />
      ))}
    </Frame>
  );
}

/* 10 — Notes rich-text editor */
export function NotesFigure() {
  const tools = ["B", "I", "U", "S", "• ", "1."];
  return (
    <Frame viewBox="0 0 460 180" label="The notes editor">
      <rect x="0" y="0" width="460" height="180" fill="#fff" />
      <rect x="16" y="16" width="428" height="30" rx="8" fill={TEAL} />
      <text x="32" y="36" fontSize="13" fontWeight="700" fill={BEIGE}>NOTES</text>
      {/* toolbar */}
      <rect x="16" y="54" width="428" height="30" rx="6" fill="#F9FAFB" stroke={BORDER} />
      {tools.map((t, i) => (
        <g key={i}>
          <rect x={26 + i * 34} y="60" width="26" height="18" rx="4" fill="#fff" stroke={BORDER} />
          <text x={39 + i * 34} y="73" textAnchor="middle" fontSize="11" fontWeight={t === "B" ? 700 : 400} fontStyle={t === "I" ? "italic" : "normal"} fill={DARK}>{t.trim() || "•"}</text>
        </g>
      ))}
      {/* body */}
      <rect x="16" y="92" width="428" height="72" rx="6" fill="#fff" stroke={BORDER} />
      <text x="30" y="112" fontSize="11" fontWeight="700" fill={DARK}>June priorities</text>
      <text x="30" y="132" fontSize="11" fill={GRAY}>•  Move $200 extra to savings</text>
      <text x="30" y="150" fontSize="11" fill={GRAY}>•  Cancel unused subscription</text>
    </Frame>
  );
}
