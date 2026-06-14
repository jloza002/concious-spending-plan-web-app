"use client";

import { usePlans, useCreatePlan, useDeletePlan, usePlan } from "@/hooks/use-spending-plan";
import { useTransactions } from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo, useState } from "react";
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
const RED = "#EF4444";
const SKY = "#0EA5E9";

type Period = "month" | "year" | "all";

export default function DashboardPage() {
  const router = useRouter();
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("month");

  // Sort plans chronologically ascending so chart x-axis reads left-to-right
  const sortedPlans = useMemo(() => {
    if (!plans) return [];
    return [...plans].sort((a, b) => (a.year !== b.year ? a.year - b.year : a.month - b.month));
  }, [plans]);

  // The most recent plan is what KPI cards reflect
  const latest = sortedPlans[sortedPlans.length - 1] ?? null;
  const previous = sortedPlans[sortedPlans.length - 2] ?? null;

  // Restrict the trend series to the selected period
  const trendPlans = useMemo(() => {
    if (period === "all") return sortedPlans;
    if (period === "year") {
      const currentYear = latest?.year ?? new Date().getFullYear();
      return sortedPlans.filter((p) => p.year === currentYear);
    }
    // month: just the latest plan as a single point
    return latest ? [latest] : [];
  }, [sortedPlans, period, latest]);

  async function handleCreate() {
    try {
      const plan = await createPlan.mutateAsync({ month: newMonth, year: newYear });
      setShowCreate(false);
      // Send the user straight to their new plan when they had none before
      if (plans?.length === 0) router.push(`/plan/${plan.id}`);
    } catch {
      // error shown inline
    }
  }

  function openModal() {
    setNewMonth(new Date().getMonth() + 1);
    setNewYear(new Date().getFullYear());
    setShowCreate(true);
  }

  function confirmDelete() {
    if (deleteId) {
      deletePlan.mutate(deleteId);
      setDeleteId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">Loading dashboard…</div>
    );
  }

  // ─── Empty state ────────────────────────────────────────────────────────
  if (!plans || plans.length === 0) {
    return (
      <>
        <EmptyDashboard onCreate={openModal} />
        {showCreate && (
          <CreatePlanModal
            month={newMonth}
            year={newYear}
            setMonth={setNewMonth}
            setYear={setNewYear}
            onClose={() => setShowCreate(false)}
            onCreate={handleCreate}
            isPending={createPlan.isPending}
            error={createPlan.error?.message ?? null}
          />
        )}
      </>
    );
  }

  // Build chart series
  const trendSeries = trendPlans.map((p) => ({
    key: `${p.year}-${String(p.month).padStart(2, "0")}`,
    label: `${MONTH_SHORT[p.month - 1]} '${String(p.year).slice(-2)}`,
    netWorth: p.totalNetWorth ?? 0,
    netIncome: p.netMonthlyIncome,
    investmentsPct: (p.investmentsPercentage ?? 0) * 100,
    savingsPct: (p.savingsPercentage ?? 0) * 100,
    guiltFreePct: (p.guiltFreePercentage ?? 0) * 100,
    fixedPct: (p.fixedCostsPercentage ?? 0) * 100,
    id: p.id,
  }));

  // KPI computed from the latest plan
  const kpiNetWorth = latest?.totalNetWorth ?? 0;
  const kpiSavingsRate = ((latest?.investmentsPercentage ?? 0) + (latest?.savingsPercentage ?? 0));
  const kpiGuiltFree = latest?.guiltFreeTotal ?? 0;
  const kpiFixedPct = latest?.fixedCostsPercentage ?? 0;

  const netWorthDelta = previous && latest ? (latest.totalNetWorth ?? 0) - (previous.totalNetWorth ?? 0) : 0;
  const savingsDelta = previous && latest
    ? (((latest.investmentsPercentage ?? 0) + (latest.savingsPercentage ?? 0)) - ((previous.investmentsPercentage ?? 0) + (previous.savingsPercentage ?? 0)))
    : 0;

  const handlePointClick = (data: { id?: string } | undefined) => {
    if (data?.id) router.push(`/plan/${data.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">Dashboard</h1>
          <p className="text-sm text-gray-500 font-sans">
            {latest ? `Showing ${MONTH_NAMES[latest.month - 1]} ${latest.year}` : "No plans yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodToggle value={period} onChange={setPeriod} />
          {latest && (
            <Link
              href={`/plan/${latest.id}`}
              className="text-xs font-medium font-sans bg-[#15302F] text-[var(--color-warm-beige)] px-3 py-2 rounded-lg hover:bg-[#15302F]/90"
            >
              Open current plan →
            </Link>
          )}
          <Button onClick={openModal} size="sm">+ New Plan</Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Net Worth"
          value={fmt(kpiNetWorth)}
          delta={previous ? fmt(netWorthDelta) : null}
          deltaPositive={netWorthDelta >= 0}
        />
        <KpiCard
          label="Savings + Investments"
          value={pct(kpiSavingsRate)}
          delta={previous ? `${savingsDelta >= 0 ? "+" : ""}${Math.round(savingsDelta * 100)}%` : null}
          deltaPositive={savingsDelta >= 0}
        />
        <KpiCard
          label="Fixed Costs Share"
          value={pct(kpiFixedPct)}
          subdued={kpiFixedPct > 0.6}
          delta={null}
          deltaPositive={false}
        />
        <KpiCard
          label="Guilt-Free Budget"
          value={fmt(kpiGuiltFree)}
          delta={null}
          deltaPositive={kpiGuiltFree >= 0}
          danger={kpiGuiltFree < 0}
        />
      </div>

      {/* Single-plan note */}
      {sortedPlans.length === 1 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-sans">
          Trend charts unlock at 2 months of data. Come back next month to see how spending and savings change.
        </div>
      )}

      {/* Trend charts — only when there's history */}
      {sortedPlans.length > 1 && (
        <>
          <Card title="Net Worth over time" subtitle="Click a point to jump to that plan">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
                <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={12} width={70} />
                <Tooltip
                  contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }}
                  formatter={(v) => fmt(Number(v))}
                />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  stroke={TEAL}
                  strokeWidth={2.5}
                  dot={{ r: 4, cursor: "pointer" }}
                  activeDot={{
                    r: 6,
                    onClick: (_: unknown, d: unknown) => handlePointClick(d as { payload?: { id?: string } } | undefined ? ((d as { payload?: { id?: string } }).payload) : undefined),
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card title="Savings + Investment Rate" subtitle="% of net income going to investments and savings">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={trendSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="label" stroke="#A3A3A3" fontSize={12} />
                  <YAxis tickFormatter={(v) => `${v}%`} stroke="#A3A3A3" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }}
                    formatter={(v, name) => [`${Math.round(Number(v))}%`, String(name)]}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="investmentsPct"
                    name="Investments"
                    stackId="1"
                    stroke={TEAL}
                    fill={TEAL}
                    fillOpacity={0.7}
                  />
                  <Area
                    type="monotone"
                    dataKey="savingsPct"
                    name="Savings"
                    stackId="1"
                    stroke={SKY}
                    fill={SKY}
                    fillOpacity={0.7}
                  />
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
                  <Tooltip
                    contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }}
                    formatter={(v) => fmt(Number(v))}
                  />
                  <Line type="monotone" dataKey="netIncome" stroke={ORANGE} strokeWidth={2.5} dot={{ r: 3 }} name="Net income" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* Current month: spending vs plan + top movers */}
      {latest && (
        <CurrentMonthSection
          planId={latest.id}
          previousPlanId={previous?.id ?? null}
        />
      )}

      {/* Plans list */}
      <Card title="All plans" subtitle="Newest first">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...sortedPlans].reverse().map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <Link href={`/plan/${plan.id}`}>
                <h3 className="font-display font-bold text-[var(--color-dark-teal)]">
                  {MONTH_NAMES[plan.month - 1]} {plan.year}
                </h3>
                <div className="mt-2 grid grid-cols-2 gap-1 text-xs font-sans">
                  <span className="text-gray-500">Net Worth</span>
                  <span className="text-right font-medium">{fmt(plan.totalNetWorth ?? 0)}</span>
                  <span className="text-gray-500">Net Income</span>
                  <span className="text-right font-medium">{fmt(plan.netMonthlyIncome)}</span>
                  <span className="text-gray-500">Guilt-Free</span>
                  <span className={`text-right font-medium ${(plan.guiltFreeTotal ?? 0) < 0 ? "text-red-500" : "text-green-600"}`}>
                    {pct(plan.guiltFreePercentage ?? 0)}
                  </span>
                </div>
              </Link>
              <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center">
                <span className="text-[10px] text-gray-400 font-sans">
                  Updated {new Date(plan.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="text-[10px] text-gray-400 hover:text-red-500 font-sans"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Create plan modal */}
      {showCreate && (
        <CreatePlanModal
          month={newMonth}
          year={newYear}
          setMonth={setNewMonth}
          setYear={setNewYear}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
          isPending={createPlan.isPending}
          error={createPlan.error?.message ?? null}
        />
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <DeleteModal
          onCancel={() => setDeleteId(null)}
          onConfirm={confirmDelete}
          isPending={deletePlan.isPending}
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
  label,
  value,
  delta,
  deltaPositive,
  subdued,
  danger,
}: {
  label: string;
  value: string;
  delta: string | null;
  deltaPositive: boolean;
  subdued?: boolean;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm ${danger ? "ring-1 ring-red-200" : ""}`}>
      <p className="text-[10px] uppercase tracking-wide text-gray-500 font-sans font-semibold">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${danger ? "text-red-500" : subdued ? "text-amber-600" : "text-[#15302F]"}`}>
        {value}
      </p>
      {delta ? (
        <p className={`mt-1 text-xs font-sans ${deltaPositive ? "text-emerald-600" : "text-red-500"}`}>
          {deltaPositive ? "▲" : "▼"} {delta} vs prior plan
        </p>
      ) : (
        <p className="mt-1 text-xs font-sans text-gray-400">—</p>
      )}
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
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

function CurrentMonthSection({
  planId,
  previousPlanId,
}: {
  planId: string;
  previousPlanId: string | null;
}) {
  const { data: plan } = usePlan(planId);
  const { data: transactions } = useTransactions(planId);
  const { data: prevTransactions } = useTransactions(previousPlanId ?? "");

  const spendingVsPlan = useMemo(() => {
    if (!plan || !transactions) return [];
    const fixedItems = plan.lineItems.filter((i) => i.section === "fixed_costs");
    return fixedItems
      .map((item) => {
        const actual = transactions
          .filter(
            (t) =>
              !t.isDuplicate &&
              t.type !== "Payment" &&
              t.spendingCategory === "fixed_costs" &&
              t.spendingSubcategory === item.label
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
    const totalByCat = (txs: typeof transactions) => {
      const out: Record<string, number> = {};
      for (const t of txs) {
        if (t.isDuplicate || t.type === "Payment") continue;
        if (!t.spendingSubcategory) continue;
        out[t.spendingSubcategory] = (out[t.spendingSubcategory] ?? 0) + -Number(t.amount);
      }
      return out;
    };
    const now = totalByCat(transactions);
    const prev = totalByCat(prevTransactions);
    const labels = new Set([...Object.keys(now), ...Object.keys(prev)]);
    return [...labels]
      .map((label) => ({
        label,
        now: now[label] ?? 0,
        prev: prev[label] ?? 0,
        delta: (now[label] ?? 0) - (prev[label] ?? 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 6);
  }, [plan, transactions, prevTransactions]);

  if (!plan) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card title="Spending vs Plan" subtitle="Fixed-cost categories — actual vs budgeted">
        {spendingVsPlan.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No fixed-cost spending categorized yet this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={spendingVsPlan}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis dataKey="name" stroke="#A3A3A3" fontSize={11} />
              <YAxis tickFormatter={(v) => fmt(v)} stroke="#A3A3A3" fontSize={11} width={70} />
              <Tooltip
                contentStyle={{ background: "white", border: `1px solid ${BEIGE}` }}
                formatter={(v) => fmt(Number(v))}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="planned" name="Planned" fill={BEIGE} />
              <Bar dataKey="actual" name="Actual" fill={ORANGE} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card title="Top movers" subtitle="Biggest category changes vs last plan">
        {!previousPlanId ? (
          <p className="text-sm text-gray-400 italic">Needs a prior month for comparison.</p>
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

function EmptyDashboard({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-8 sm:p-12 shadow-sm text-center">
      <div className="text-5xl mb-4">📊</div>
      <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mb-2">
        Welcome to your dashboard
      </h1>
      <p className="text-gray-500 font-sans mb-6 max-w-md mx-auto">
        Create your first Conscious Spending Plan to start tracking your money. Once you have a couple of months of data, trend charts and category insights will unlock here.
      </p>
      <Button onClick={onCreate} size="lg">Create Your First Plan</Button>

      {/* Faded preview */}
      <div className="mt-10 opacity-30 select-none pointer-events-none">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {["Net Worth","Savings","Fixed Costs","Guilt-Free"].map((l) => (
            <div key={l} className="rounded-lg border border-gray-200 p-3 text-left">
              <p className="text-[10px] uppercase tracking-wide text-gray-400">{l}</p>
              <p className="font-display text-lg font-bold text-gray-300">$ —</p>
            </div>
          ))}
        </div>
        <div className="h-32 rounded-lg border border-dashed border-gray-200" />
      </div>
    </div>
  );
}

function CreatePlanModal({
  month,
  year,
  setMonth,
  setYear,
  onClose,
  onCreate,
  isPending,
  error,
}: {
  month: number;
  year: number;
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
  onClose: () => void;
  onCreate: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-cream)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[var(--color-dark-teal)] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">New Spending Plan</h2>
          <button onClick={onClose} className="text-[var(--color-warm-beige)] opacity-70 hover:opacity-100 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-[var(--color-orange)] bg-white"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-[var(--color-orange)] bg-white"
            />
          </div>
          {error && <p className="text-sm text-red-500 font-sans">{error}</p>}
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={onCreate} disabled={isPending}>
            {isPending ? "Creating…" : "Create Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  onCancel,
  onConfirm,
  isPending,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[var(--color-cream)] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="bg-[var(--color-dark-teal)] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">Delete Plan</h2>
          <button onClick={onCancel} className="text-[var(--color-warm-beige)] opacity-70 hover:opacity-100 text-xl leading-none">✕</button>
        </div>
        <div className="px-6 py-6">
          <p className="font-sans text-gray-700 text-sm">Permanently delete this plan and all its transactions?</p>
          <p className="font-sans text-gray-700 text-sm mt-2">This action cannot be undone.</p>
        </div>
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button onClick={onConfirm} disabled={isPending} className="bg-red-500 hover:bg-red-600 text-white">
            {isPending ? "Deleting…" : "Delete Plan"}
          </Button>
        </div>
      </div>
    </div>
  );
}
