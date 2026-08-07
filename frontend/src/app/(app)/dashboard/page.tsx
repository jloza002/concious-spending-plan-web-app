"use client";

import { usePlans, useCategorySummary } from "@/hooks/use-spending-plan";
import { buildSpendingVsPlanFromTotals } from "@/lib/budget-display";
import { selectRangePlans, selectComparePlans, buildPieSlices, type Period } from "@/lib/dashboard-display";
import { fmt } from "@/components/dashboard/charts";
import type { TrendPoint } from "@/components/dashboard/charts";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GuidedTour } from "@/components/tour/guided-tour";
import { DASHBOARD_TOUR } from "@/components/tour/tours";

// Recharts is a heavy client-only dependency — code-split it out of the
// initial dashboard bundle so it only loads once a chart is actually shown.
function ChartSkeleton({ height }: { height: number }) {
  return <div className="w-full animate-pulse bg-gray-100 rounded-lg" style={{ height }} />;
}
const NetWorthTrendChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.NetWorthTrendChart), { ssr: false, loading: () => <ChartSkeleton height={240} /> });
const SavingsInvestmentChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.SavingsInvestmentChart), { ssr: false, loading: () => <ChartSkeleton height={220} /> });
const IncomeTrendChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.IncomeTrendChart), { ssr: false, loading: () => <ChartSkeleton height={220} /> });
const SpendingVsPlanChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.SpendingVsPlanChart), { ssr: false, loading: () => <ChartSkeleton height={240} /> });
const FixedCostsPieChart = dynamic(() => import("@/components/dashboard/charts").then((m) => m.FixedCostsPieChart), { ssr: false, loading: () => <ChartSkeleton height={220} /> });

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function DashboardPage() {
  const router = useRouter();
  const { data: plans, isLoading } = usePlans();
  const [period, setPeriod] = useState<Period>("month");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Only locked ("complete") plans appear on the dashboard, newest first.
  const lockedPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans]
      .filter((p) => p.isLocked)
      .sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  }, [plans]);

  // Default the selected month to the most recent locked plan.
  useEffect(() => {
    if (lockedPlans.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !lockedPlans.some((p) => p.id === selectedId)) {
      setSelectedId(lockedPlans[lockedPlans.length - 1].id);
    }
  }, [lockedPlans, selectedId]);

  const selected = lockedPlans.find((p) => p.id === selectedId) ?? null;
  const selectedIndex = selected ? lockedPlans.findIndex((p) => p.id === selected.id) : -1;
  const previous = selectedIndex > 0 ? lockedPlans[selectedIndex - 1] : null;

  // Which locked plans feed the trend charts, depending on the period.
  const trendPlans = useMemo(() => {
    if (!selected) return [];
    if (period === "all") return lockedPlans;
    if (period === "year") return lockedPlans.filter((p) => p.year === selected.year);
    // month: the selected month plus a little history for context (up to 6 prior)
    const upto = lockedPlans.slice(0, selectedIndex + 1);
    return upto.slice(Math.max(0, upto.length - 6));
  }, [lockedPlans, period, selected, selectedIndex]);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500 font-sans">Loading dashboard…</div>;
  }

  // ─── Empty state: no locked plans ───────────────────────────────────────
  if (lockedPlans.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 shadow-sm text-center">
        <div className="text-5xl mb-4">📊</div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mb-2">
          Your dashboard is waiting
        </h1>
        <p className="text-gray-500 font-sans mb-6 max-w-md mx-auto">
          The dashboard only shows <strong>locked</strong> (finalized) plans, so your numbers reflect months you&apos;ve closed out.
          Open a plan, finish categorizing, and click <em>Lock plan</em> — it&apos;ll appear here.
        </p>
        <Link
          href="/plans"
          className="inline-flex items-center justify-center px-6 py-3 bg-[var(--color-orange)] text-white font-medium rounded-lg hover:opacity-90 transition-opacity font-sans"
        >
          Go to your plans
        </Link>
      </div>
    );
  }

  const trendSeries: TrendPoint[] = trendPlans.map((p) => ({
    key: `${p.year}-${String(p.month).padStart(2, "0")}`,
    label: `${MONTH_SHORT[p.month - 1]} '${String(p.year).slice(-2)}`,
    netWorth: p.totalNetWorth ?? 0,
    netIncome: p.netMonthlyIncome,
    investmentsPct: (p.investmentsPercentage ?? 0) * 100,
    savingsPct: (p.savingsPercentage ?? 0) * 100,
    id: p.id,
  }));

  // KPIs aggregate over the selected period. Net worth is point-in-time (latest
  // in range), rates are averaged, and guilt-free budget is summed for the range.
  const kpiPlans =
    period === "all"
      ? lockedPlans
      : period === "year"
      ? lockedPlans.filter((p) => p.year === (selected?.year ?? 0))
      : selected
      ? [selected]
      : [];
  const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

  const latestInRange = kpiPlans.length ? kpiPlans[kpiPlans.length - 1] : selected;
  const kpiNetWorth = latestInRange?.totalNetWorth ?? 0;
  const kpiSavingsRate = avg(kpiPlans.map((p) => (p.investmentsPercentage ?? 0) + (p.savingsPercentage ?? 0)));
  const kpiFixedPct = avg(kpiPlans.map((p) => p.fixedCostsPercentage ?? 0));
  const kpiGuiltFree =
    period === "month"
      ? selected?.guiltFreeTotal ?? 0
      : kpiPlans.reduce((s, p) => s + (p.guiltFreeTotal ?? 0), 0);

  // Month-over-month deltas only make sense in single-month view.
  const showDeltas = period === "month";
  const netWorthDelta = showDeltas && previous && selected ? (selected.totalNetWorth ?? 0) - (previous.totalNetWorth ?? 0) : 0;
  const savingsDelta = showDeltas && previous && selected
    ? (((selected.investmentsPercentage ?? 0) + (selected.savingsPercentage ?? 0)) - ((previous.investmentsPercentage ?? 0) + (previous.savingsPercentage ?? 0)))
    : 0;

  const monthCount = kpiPlans.length;
  const periodLabel =
    period === "month"
      ? selected
        ? `${MONTH_NAMES[selected.month - 1]} ${selected.year}`
        : ""
      : period === "year"
      ? `${selected?.year ?? ""} · ${monthCount} locked month${monthCount === 1 ? "" : "s"}`
      : `All time · ${monthCount} locked month${monthCount === 1 ? "" : "s"}`;
  const aggSuffix = period === "month" ? "" : period === "year" ? " (this year)" : " (all time)";

  const handleChartClick = (state: unknown) => {
    const payload = (state as { activePayload?: Array<{ payload?: { id?: string } }> } | undefined)
      ?.activePayload?.[0]?.payload;
    if (payload?.id) router.push(`/plan/${payload.id}`);
  };

  const showTrends = trendSeries.length > 1;

  return (
    <div className="space-y-6">
      <GuidedTour tourId="dashboard" steps={DASHBOARD_TOUR} version={2} />
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans">Locked plans only</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap" data-tour="dash-period">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-sans bg-white focus:outline-none focus:border-[var(--color-orange)]"
          >
            {[...lockedPlans].reverse().map((p) => (
              <option key={p.id} value={p.id}>
                {MONTH_NAMES[p.month - 1]} {p.year}
              </option>
            ))}
          </select>
          <PeriodToggle value={period} onChange={setPeriod} />
          {selected && (
            <Link
              href={`/plan/${selected.id}`}
              className="text-xs font-medium font-sans bg-[#15302F] text-[var(--color-warm-beige)] px-3 py-2 rounded-lg hover:bg-[#15302F]/90"
            >
              Open this plan →
            </Link>
          )}
        </div>
      </div>

      {/* Period context */}
      <p className="text-xs text-gray-400 font-sans -mt-2">Showing: <span className="text-gray-600 font-medium">{periodLabel}</span></p>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="dash-kpis">
        <KpiCard label={period === "month" ? "Net Worth" : "Net Worth (latest)"} value={fmt(kpiNetWorth)} delta={showDeltas && previous ? fmt(netWorthDelta) : null} deltaPositive={netWorthDelta >= 0} />
        <KpiCard label={`Savings + Investments${period === "month" ? "" : " (avg)"}`} value={pct(kpiSavingsRate)} delta={showDeltas && previous ? `${savingsDelta >= 0 ? "+" : ""}${Math.round(savingsDelta * 100)}%` : null} deltaPositive={savingsDelta >= 0} />
        <KpiCard label={`Fixed Costs Share${period === "month" ? "" : " (avg)"}`} value={pct(kpiFixedPct)} subdued={kpiFixedPct > 0.6} delta={null} deltaPositive={false} />
        <KpiCard label={`Guilt-Free Budget${aggSuffix}`} value={fmt(kpiGuiltFree)} delta={null} deltaPositive={kpiGuiltFree >= 0} danger={kpiGuiltFree < 0} />
      </div>

      {/* Period context note */}
      {period !== "month" && !showTrends && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-sans">
          Only one locked plan in this {period === "year" ? "year" : "range"} — lock more months to see trends.
        </div>
      )}

      {/* Trend charts */}
      {showTrends && (
        <Card title="Net Worth over time" subtitle="Click a point to open that plan">
          <NetWorthTrendChart data={trendSeries} onPointClick={handleChartClick} />
        </Card>
      )}

      {/* Fixed costs by category — full width, right under the net worth trend */}
      {selected && (
        <FixedCostsPieCard
          period={period}
          rangePlans={selectRangePlans(period, lockedPlans, selected)}
        />
      )}

      {showTrends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Savings + Investment Rate" subtitle="% of net income to investments and savings">
            <SavingsInvestmentChart data={trendSeries} />
          </Card>

          <Card title="Income trend" subtitle="Net monthly income">
            <IncomeTrendChart data={trendSeries} />
          </Card>
        </div>
      )}

      {/* Period detail: Spending vs Plan, Top Movers — both period-aware */}
      {selected && (
        <PeriodDetailSection
          period={period}
          rangePlans={selectRangePlans(period, lockedPlans, selected)}
          comparePlans={selectComparePlans(period, lockedPlans, selected, previous)}
        />
      )}
    </div>
  );
}

// ─── Sub components ───────────────────────────────────────────────────────────

function PeriodToggle({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const options: { v: Period; label: string }[] = [
    { v: "month", label: "Month" },
    { v: "year", label: "Year" },
    { v: "all", label: "All-time" },
  ];
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 bg-white text-xs font-sans">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 ${value === o.v ? "bg-[#15302F] text-[var(--color-warm-beige)]" : "text-gray-500 hover:bg-gray-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function KpiCard({
  label, value, delta, deltaPositive, subdued, danger,
}: {
  label: string; value: string; delta: string | null; deltaPositive: boolean; subdued?: boolean; danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${danger ? "ring-1 ring-red-200" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-sans font-semibold">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${danger ? "text-red-500" : subdued ? "text-amber-600" : "text-[#15302F]"}`}>{value}</p>
      {delta ? (
        <p className={`mt-1 text-xs font-sans ${deltaPositive ? "text-emerald-600" : "text-red-500"}`}>
          {deltaPositive ? "▲" : "▼"} {delta} vs prior month
        </p>
      ) : (
        <p className="mt-1 text-xs font-sans text-gray-400">—</p>
      )}
    </div>
  );
}

function Card({
  title, subtitle, children, dataTour,
}: { title: string; subtitle?: string; children: React.ReactNode; dataTour?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm" data-tour={dataTour}>
      <div className="mb-3">
        <h3 className="font-display font-bold text-[#15302F]">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-sans">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function PeriodDetailSection({
  period,
  rangePlans,
  comparePlans,
}: {
  period: Period;
  rangePlans: { id: string }[];
  comparePlans: { id: string }[];
}) {
  const rangeIds = useMemo(() => rangePlans.map((p) => p.id), [rangePlans]);
  const compareIds = useMemo(() => comparePlans.map((p) => p.id), [comparePlans]);
  const { data: summary } = useCategorySummary(rangeIds, compareIds);

  // "Planned" comes from the Budget page, summed across every month in range.
  const spendingVsPlan = useMemo(
    () => (summary ? buildSpendingVsPlanFromTotals(summary.actual, summary.planned) : []),
    [summary]
  );

  const topMovers = useMemo(() => {
    if (!summary) return [];
    const labels = new Set([...Object.keys(summary.actual), ...Object.keys(summary.compareActual)]);
    return [...labels]
      .map((label) => ({
        label,
        delta: (summary.actual[label] ?? 0) - (summary.compareActual[label] ?? 0),
      }))
      .filter((m) => Math.abs(m.delta) >= 0.5)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [summary]);

  const noCompareReason =
    period === "month"
      ? "Needs a prior locked month for comparison."
      : period === "year"
      ? "Needs a prior year with locked months for comparison."
      : "Top movers compares two periods — switch to Month or Year to see it.";

  if (rangePlans.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-tour="dash-period-detail">
      <Card title="Spending vs Plan" subtitle="Fixed-cost categories — actual vs budgeted">
        {spendingVsPlan.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            Nothing to compare yet. Set targets on the Budget page, or categorize
            fixed-cost transactions.
          </p>
        ) : (
          <SpendingVsPlanChart data={spendingVsPlan} />
        )}
      </Card>

      <Card title="Top movers" subtitle={`Biggest category changes${period === "month" ? " vs prior locked month" : period === "year" ? " vs prior year" : ""}`}>
        {comparePlans.length === 0 ? (
          <p className="text-sm text-gray-400 italic">{noCompareReason}</p>
        ) : topMovers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No comparable spending categories yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {topMovers.map((m) => (
              <li key={m.label} className="flex items-center justify-between py-2 text-sm">
                <span className="font-sans text-gray-800 truncate">{m.label}</span>
                <span className={`font-sans font-medium tabular-nums ${m.delta >= 0 ? "text-red-500" : "text-emerald-600"}`}>
                  {m.delta >= 0 ? "▲" : "▼"} {fmt(Math.abs(m.delta))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

/** Full-width fixed-costs pie chart, positioned right under the net worth trend. */
function FixedCostsPieCard({ period, rangePlans }: { period: Period; rangePlans: { id: string }[] }) {
  const router = useRouter();
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const rangeIds = useMemo(() => rangePlans.map((p) => p.id), [rangePlans]);
  const { data: summary } = useCategorySummary(rangeIds, []);
  const pieSlices = useMemo(() => buildPieSlices(summary?.actual ?? {}), [summary]);
  const pieTotal = pieSlices.reduce((s, sl) => s + sl.value, 0);

  function handleSliceClick(label: string) {
    if (period === "month" && rangePlans[0] && !label.startsWith("Other (")) {
      router.push(`/plan/${rangePlans[0].id}/import?category=${encodeURIComponent(label)}`);
      return;
    }
    // Year/All-time: no single plan to open — just highlight the slice.
    setHighlighted((prev) => (prev === label ? null : label));
  }

  if (rangePlans.length === 0) return null;

  return (
    <Card
      dataTour="dash-pie"
      title="Fixed costs by category"
      subtitle={period === "month" ? "Click a slice to see those transactions" : "Click a slice to highlight it"}
    >
      {pieSlices.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No fixed-cost spending yet for this {period === "month" ? "month" : period === "year" ? "year" : "range"}.
        </p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 pb-6">
          <div className="w-[220px] h-[220px] shrink-0">
            <FixedCostsPieChart slices={pieSlices} highlighted={highlighted} onSliceClick={handleSliceClick} />
          </div>
          <ul className="w-full max-w-xs sm:w-80 space-y-1">
            {pieSlices.map((slice) => (
              <li
                key={slice.label}
                onClick={() => handleSliceClick(slice.label)}
                className={`flex items-center justify-between gap-3 text-xs font-sans py-1 cursor-pointer rounded px-1.5 ${
                  highlighted === slice.label ? "bg-gray-50" : ""
                }`}
              >
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: slice.color }} />
                  <span className="truncate text-gray-700">{slice.label}</span>
                </span>
                <span className="tabular-nums text-gray-500 shrink-0">
                  {fmt(slice.value)} · {pieTotal > 0 ? Math.round((slice.value / pieTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
          {/* Accessible fallback: recharts' Pie exposes nothing to screen readers natively. */}
          <span className="sr-only">
            Fixed costs by category: {pieSlices.map((s) => `${s.label} ${fmt(s.value)}`).join(", ")}.
          </span>
        </div>
      )}
    </Card>
  );
}
