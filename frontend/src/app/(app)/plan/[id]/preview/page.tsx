"use client";

import { use } from "react";
import { usePlan } from "@/hooks/use-spending-plan";
import { Button } from "@/components/ui/button";
import { MISCELLANEOUS_RATE } from "@csp/shared";

export default function PreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);
  const { data: plan, isLoading } = usePlan(planId);

  async function handleDownload() {
    const res = await fetch(`/api/backend/plans/${planId}/export`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Conscious-Spending-Plan-${plan?.month}-${plan?.year}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading || !plan) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading preview...
      </div>
    );
  }

  const fc = plan.lineItems.filter((i) => i.section === "fixed_costs");
  const inv = plan.lineItems.filter((i) => i.section === "investments");
  const sav = plan.lineItems.filter((i) => i.section === "savings");
  const calcs = plan.calculations;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div>
      <div className="flex justify-end gap-3 mb-6 no-print">
        <Button variant="ghost" onClick={() => window.print()}>
          Print
        </Button>
        <Button onClick={handleDownload}>Download Excel</Button>
      </div>

      {/* Percentage Breakdown Bar */}
      <div className="mb-6 no-print">
        <div className="flex h-8 rounded-lg overflow-hidden shadow-sm">
          <div
            className="bg-[var(--color-dark-teal)] flex items-center justify-center text-white text-xs font-sans"
            style={{ width: `${Math.max(calcs.fixedCostsPercentage * 100, 0)}%` }}
          >
            {calcs.fixedCostsPercentage > 0.05 && `Fixed ${pct(calcs.fixedCostsPercentage)}`}
          </div>
          <div
            className="bg-blue-500 flex items-center justify-center text-white text-xs font-sans"
            style={{ width: `${Math.max(calcs.investmentsPercentage * 100, 0)}%` }}
          >
            {calcs.investmentsPercentage > 0.05 && `Inv ${pct(calcs.investmentsPercentage)}`}
          </div>
          <div
            className="bg-green-500 flex items-center justify-center text-white text-xs font-sans"
            style={{ width: `${Math.max(calcs.savingsPercentage * 100, 0)}%` }}
          >
            {calcs.savingsPercentage > 0.05 && `Sav ${pct(calcs.savingsPercentage)}`}
          </div>
          <div
            className="bg-[var(--color-orange)] flex items-center justify-center text-white text-xs font-sans"
            style={{ width: `${Math.max(calcs.guiltFreePercentage * 100, 0)}%` }}
          >
            {calcs.guiltFreePercentage > 0.05 && `Free ${pct(calcs.guiltFreePercentage)}`}
          </div>
        </div>
      </div>

      {/* Excel-like Preview */}
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Title */}
        <div className="px-6 py-8 text-right">
          <h2 className="font-display text-3xl font-bold text-[var(--color-dark-teal)]">
            Conscious Spending Plan
          </h2>
          <p className="text-sm text-gray-500 font-sans mt-1">
            {MONTH_NAMES[plan.month - 1]} {plan.year}
          </p>
        </div>

        {/* NET WORTH */}
        <SectionBlock title="NET WORTH">
          <DataRow label="Assets" value={fmt(plan.assets)} />
          <DataRow label="Investments" value={fmt(plan.investmentsNw)} />
          <DataRow label="Savings" value={fmt(plan.savingsNw)} />
          <DataRow label="Debt" value={fmt(plan.debt)} />
          <TotalBlock label="TOTAL NET WORTH" value={fmt(calcs.totalNetWorth)} />
        </SectionBlock>

        {/* INCOME */}
        <SectionBlock title="INCOME">
          <DataRow label="Gross monthly income" value={fmt(plan.grossMonthlyIncome)} />
          <TotalBlock
            label="Net monthly income (post-tax, after deductions)"
            value={fmt(plan.netMonthlyIncome)}
          />
        </SectionBlock>

        {/* FIXED COSTS */}
        <SectionBlock title={`FIXED COSTS (50-60%)`} percentage={pct(calcs.fixedCostsPercentage)}>
          {fc.map((item) => (
            <DataRow key={item.id} label={item.label} value={fmt(item.amount)} />
          ))}
          <div className="flex justify-between px-6 py-2 text-gray-500 italic text-sm font-sans">
            <span>Miscellaneous (auto {Math.round(MISCELLANEOUS_RATE * 100)}%)</span>
            <span>{fmt(calcs.miscellaneous)}</span>
          </div>
          <TotalBlock label="FIXED COSTS TOTAL" value={fmt(calcs.fixedCostsTotal)} />
        </SectionBlock>

        {/* INVESTMENTS */}
        <SectionBlock title="INVESTMENTS (10%)" percentage={pct(calcs.investmentsPercentage)}>
          {inv.map((item) => (
            <DataRow key={item.id} label={item.label} value={fmt(item.amount)} />
          ))}
          <TotalBlock label="INVESTMENTS TOTAL" value={fmt(calcs.investmentsTotal)} />
        </SectionBlock>

        {/* SAVINGS GOALS */}
        <SectionBlock title="SAVINGS GOALS (5-10%)" percentage={pct(calcs.savingsPercentage)}>
          {sav.map((item) => (
            <DataRow key={item.id} label={item.label} value={fmt(item.amount)} />
          ))}
          <TotalBlock label="SAVINGS TOTAL" value={fmt(calcs.savingsTotal)} />
        </SectionBlock>

        {/* GUILT-FREE SPENDING */}
        <SectionBlock title="GUILT-FREE SPENDING (20-35%)" percentage={pct(calcs.guiltFreePercentage)}>
          <TotalBlock
            label="GUILT-FREE SPENDING TOTAL"
            value={fmt(calcs.guiltFreeTotal)}
            negative={calcs.guiltFreeTotal < 0}
          />
        </SectionBlock>
      </div>
    </div>
  );
}

function SectionBlock({
  title,
  percentage,
  children,
}: {
  title: string;
  percentage?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center justify-between bg-[var(--color-dark-teal)] px-6 py-3">
        <span className="font-display text-white font-bold">{title}</span>
        {percentage && (
          <span className="font-sans text-white font-bold">{percentage}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-6 py-2 border-b border-gray-50 text-sm font-sans">
      <span className="text-gray-800">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function TotalBlock({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="flex justify-between px-6 py-2 border-t border-gray-200">
      <span
        className={`font-sans font-bold text-sm ${negative ? "text-red-500" : "text-[var(--color-orange)]"}`}
      >
        {label}
      </span>
      <span
        className={`font-sans font-bold text-sm tabular-nums ${negative ? "text-red-500" : "text-[var(--color-orange)]"}`}
      >
        {value}
      </span>
    </div>
  );
}
