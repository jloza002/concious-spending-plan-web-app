"use client";

import { usePlans, usePlan } from "@/hooks/use-spending-plan";
import { useTransactions } from "@/hooks/use-transactions";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { useRouter } from "next/navigation";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

const TEAL = "#15302F";
const ORANGE = "#FB4D30";
const BEIGE = "#EEE3D2";
const GREEN = "#22C55E";
const SKY = "#0EA5E9";

type Period = "month" | "year" | "all";

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

  const trendSeries = trendPlans.map((p) => ({
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans">Locked plans only</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <>
          <Card title="Net Worth over time" subtitle="Click a point to open that plan">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendSeries} onClick={handleChartClick as never} style={{ cursor: "pointer" }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
                <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={12} width={70} />
                <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Savings + Investment Rate" subtitle="% of net income to investments and savings">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v}%`} stroke="#A3A3A3" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v, name) => [`${Math.round(Number(v))}%`, String(name)]} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="investmentsPct" name="Investments" stackId="1" stroke={TEAL} fill={TEAL} fillOpacity={0.7} />
                  <Area type="monotone" dataKey="savingsPct" name="Savings" stackId="1" stroke={SKY} fill={SKY} fillOpacity={0.7} />
                  <ReferenceLine y={20} stroke={GREEN} strokeDasharray="3 3" label={{ value: "IWT target 20%", position: "insideTopRight", fontSize: 10, fill: GREEN }} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Income trend" subtitle="Net monthly income">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
                  <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={12} width={70} />
                  <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
                  <Line type="monotone" dataKey="netIncome" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3 }} name="Net income" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* Selected month detail */}
      {selected && (
        <CurrentMonthSection planId={selected.id} previousPlanId={previous?.id ?? null} />
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

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="font-display font-bold text-[#15302F]">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 font-sans">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function CurrentMonthSection({ planId, previousPlanId }: { planId: string; previousPlanId: string | null }) {
  const { data: plan } = usePlan(planId);
  const { data: transactions } = useTransactions(planId);
  const { data: prevTransactions } = useTransactions(previousPlanId ?? "");

  const spendingVsPlan = useMemo(() => {
    if (!plan || !transactions) return [];
    const fixedItems = plan.lineItems.filter((i) => i.section === "fixed_costs");
    const labels = new Set(fixedItems.map((i) => i.label));
    return fixedItems
      .map((item) => {
        const actual = transactions
          .filter((t) =>
            !t.isDuplicate &&
            t.type !== "Payment" &&
            t.spendingCategory === "fixed_costs" &&
            t.spendingSubcategory === item.label &&
            labels.has(t.spendingSubcategory)
          )
          .reduce((s, t) => s + -Number(t.amount), 0);
        return {
          name: item.label.length > 14 ? item.label.slice(0, 12) + "…" : item.label,
          actual: Math.round(actual),
          planned: Math.round(Number(item.amount)),
        };
      })
      .filter((r) => r.actual > 0 || r.planned > 0)
      .slice(0, 10);
  }, [plan, transactions]);

  const topMovers = useMemo(() => {
    if (!plan || !transactions || !prevTransactions) return [];
    const validLabels = new Set(plan.lineItems.map((i) => i.label));
    const totalByCat = (txs: typeof transactions) => {
      const out: Record<string, number> = {};
      for (const t of txs) {
        if (t.isDuplicate || t.type === "Payment") continue;
        if (!t.spendingSubcategory || !validLabels.has(t.spendingSubcategory)) continue;
        out[t.spendingSubcategory] = (out[t.spendingSubcategory] ?? 0) + -Number(t.amount);
      }
      return out;
    };
    const now = totalByCat(transactions);
    const prev = totalByCat(prevTransactions);
    const labels = new Set([...Object.keys(now), ...Object.keys(prev)]);
    return [...labels]
      .map((label) => ({ label, delta: (now[label] ?? 0) - (prev[label] ?? 0) }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [plan, transactions, prevTransactions]);

  if (!plan) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Spending vs Plan" subtitle="Fixed-cost categories — actual vs budgeted">
        {spendingVsPlan.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No fixed-cost spending categorized in this plan.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={spendingVsPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} />
              <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={11} width={70} />
              <Tooltip contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }} formatter={(v) => fmt(Number(v))} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="planned" name="Planned" fill={BEIGE} />
              <Bar dataKey="actual" name="Actual" fill={ORANGE} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Top movers" subtitle="Biggest category changes vs prior locked month">
        {!previousPlanId ? (
          <p className="text-sm text-gray-400 italic">Needs a prior locked month for comparison.</p>
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
