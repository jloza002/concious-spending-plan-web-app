"use client";

import { use, useMemo } from "react";
import { usePlan, useUpdatePlan } from "@/hooks/use-spending-plan";
import { useUpdateLineItem, useAddLineItem, useDeleteLineItem, useReorderLineItems, useToggleExcludeLineItem } from "@/hooks/use-line-items";
import { useTransactions } from "@/hooks/use-transactions";
import { useTogglePlanLock } from "@/hooks/use-user-categories";
import { NetWorthSection } from "@/components/plan/net-worth-section";
import { IncomeSection } from "@/components/plan/income-section";
import { FixedCostsSection } from "@/components/plan/fixed-costs-section";
import { InvestmentsSection } from "@/components/plan/investments-section";
import { SavingsSection } from "@/components/plan/savings-section";
import { GuiltFreeSection } from "@/components/plan/guilt-free-section";
import { NotesSection } from "@/components/plan/notes-section";
import { MISCELLANEOUS_RATE } from "@csp/shared";
import { GuidedTour } from "@/components/tour/guided-tour";
import { PLAN_TOUR } from "@/components/tour/tours";
import Link from "next/link";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export default function PlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);
  const { data: plan, isLoading, error } = usePlan(planId);
  const { debouncedUpdate, isPending: isSaving } = useUpdatePlan(planId);
  const { debouncedUpdate: updateItem } = useUpdateLineItem(planId);
  const addItem = useAddLineItem(planId);
  const deleteItem = useDeleteLineItem(planId);
  const reorderItems = useReorderLineItems(planId);
  const toggleExclude = useToggleExcludeLineItem(planId);
  const { data: transactions } = useTransactions(planId);
  const toggleLock = useTogglePlanLock(planId);

  // Aggregate transaction amounts by fixed_costs subcategory.
  // Only count subcategories that still exist as line items in this plan — a
  // transaction tagged to a deleted category is treated as uncategorized (it
  // drops out of fixed costs) rather than surfacing as an orphan row.
  const fixedCategoryTotals = useMemo<Record<string, number>>(() => {
    if (!transactions || !plan) return {};
    const validLabels = new Set(
      plan.lineItems.filter((i) => i.section === "fixed_costs").map((i) => i.label)
    );
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (
        t.spendingCategory !== "fixed_costs" ||
        !t.spendingSubcategory ||
        !validLabels.has(t.spendingSubcategory) ||
        t.isDuplicate ||
        t.type === "Payment"
      ) continue;
      totals[t.spendingSubcategory] = (totals[t.spendingSubcategory] ?? 0) + (-t.amount);
    }
    return totals;
  }, [transactions, plan]);

  // Override plan calculations with transaction-based fixed costs, dropping any
  // line the user has excluded (per-line "what-if") from its section total.
  const calculations = useMemo(() => {
    if (!plan) return null;
    const net = plan.netMonthlyIncome;
    const excludedFixedLabels = new Set(
      plan.lineItems.filter((i) => i.section === "fixed_costs" && i.excluded).map((i) => i.label)
    );
    const fixedCostsSubtotal = Object.entries(fixedCategoryTotals).reduce(
      (s, [label, v]) => (excludedFixedLabels.has(label) ? s : s + v),
      0
    );
    const miscellaneous = plan.includeMiscellaneous ? fixedCostsSubtotal * MISCELLANEOUS_RATE : 0;
    const fixedCostsTotal = fixedCostsSubtotal + miscellaneous;
    const investmentsTotal = plan.lineItems
      .filter((i) => i.section === "investments" && !i.excluded)
      .reduce((s, i) => s + i.amount, 0);
    const savingsTotal = plan.lineItems
      .filter((i) => i.section === "savings" && !i.excluded)
      .reduce((s, i) => s + i.amount, 0);
    const guiltFreeTotal = net - fixedCostsTotal - investmentsTotal - savingsTotal;
    const pct = (v: number) => (net > 0 ? v / net : 0);
    return {
      ...plan.calculations,
      fixedCostsSubtotal,
      miscellaneous,
      fixedCostsTotal,
      fixedCostsPercentage: pct(fixedCostsTotal),
      investmentsTotal,
      investmentsPercentage: pct(investmentsTotal),
      savingsTotal,
      savingsPercentage: pct(savingsTotal),
      guiltFreeTotal,
      guiltFreePercentage: pct(guiltFreeTotal),
    };
  }, [plan, fixedCategoryTotals]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading plan...
      </div>
    );
  }

  if (error || !plan || !calculations) {
    return (
      <div className="text-center py-12 text-red-500 font-sans">
        Failed to load plan. <Link href="/plans" className="underline">Back to plans</Link>
      </div>
    );
  }

  const fixedCostItems = plan.lineItems.filter((i) => i.section === "fixed_costs");
  const investmentItems = plan.lineItems.filter((i) => i.section === "investments");
  const savingsItems = plan.lineItems.filter((i) => i.section === "savings");

  function handleFieldChange(field: string, value: number) {
    debouncedUpdate({ [field]: value });
  }

  function handleAmountChange(id: string, amount: number) {
    updateItem(id, { amount });
  }

  function handleLabelChange(id: string, label: string) {
    updateItem(id, { label });
  }

  function handleAddItem(section: "fixed_costs" | "investments" | "savings") {
    addItem.mutate({ section, label: "New Item", amount: 0 });
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate(id);
  }

  function handleReorder(items: { id: string; sortOrder: number }[]) {
    reorderItems.mutate(items);
  }

  function handleToggleExclude(id: string, excluded: boolean) {
    toggleExclude.mutate({ itemId: id, excluded });
  }

  return (
    <div>
      <GuidedTour tourId="plan" steps={PLAN_TOUR} />
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          {plan.isLocked ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
              title="This plan is finalized. It appears on your dashboard and is protected from category-library edits."
            >
              <LockIcon className="w-3.5 h-3.5" /> Locked &amp; on dashboard
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Draft — not on dashboard
            </span>
          )}
          <span className={`text-xs text-gray-400 font-sans transition-opacity duration-150 ${isSaving ? "opacity-100" : "opacity-0"}`}>Saving…</span>
        </div>
        <button
          type="button"
          data-tour="plan-lock"
          onClick={() => toggleLock.mutate(!plan.isLocked)}
          disabled={toggleLock.isPending}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium font-sans shrink-0 transition-colors disabled:opacity-50 ${
            plan.isLocked
              ? "bg-white text-[#15302F] border border-gray-300 hover:bg-gray-50"
              : "bg-[#15302F] text-[var(--color-warm-beige)] hover:bg-[#15302F]/90 shadow-sm"
          }`}
          title={plan.isLocked ? "Unlock to edit categories again" : "Lock to finalize this month and show it on the dashboard"}
        >
          {toggleLock.isPending ? (
            "Saving…"
          ) : plan.isLocked ? (
            <><UnlockIcon className="w-4 h-4" /> Unlock plan</>
          ) : (
            <><LockIcon className="w-4 h-4" /> Lock plan</>
          )}
        </button>
      </div>

      {toggleLock.isError && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-sans">
          Couldn&apos;t {plan.isLocked ? "unlock" : "lock"} this plan: {toggleLock.error instanceof Error ? toggleLock.error.message : "request failed"}.
          {" "}If this says &quot;not found&quot; or 404, the server may still be updating — try again shortly.
        </div>
      )}

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <NetWorthSection
          assets={plan.assets}
          investmentsNw={plan.investmentsNw}
          savingsNw={plan.savingsNw}
          debt={plan.debt}
          totalNetWorth={plan.assets + plan.investmentsNw + plan.savingsNw - plan.debt}
          onFieldChange={handleFieldChange}
        />

        <IncomeSection
          grossMonthlyIncome={plan.grossMonthlyIncome}
          netMonthlyIncome={plan.netMonthlyIncome}
          onFieldChange={handleFieldChange}
        />

        <FixedCostsSection
          items={fixedCostItems}
          categoryTotals={fixedCategoryTotals}
          calculations={calculations}
          includeMiscellaneous={plan.includeMiscellaneous}
          onDeleteMiscellaneous={() => debouncedUpdate({ includeMiscellaneous: false })}
          onToggleExclude={handleToggleExclude}
          onReorder={handleReorder}
        />

        <InvestmentsSection
          items={investmentItems}
          calculations={calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("investments")}
          onDeleteItem={handleDeleteItem}
          onReorder={handleReorder}
        />

        <SavingsSection
          items={savingsItems}
          calculations={calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("savings")}
          onDeleteItem={handleDeleteItem}
          onToggleExclude={handleToggleExclude}
          onReorder={handleReorder}
        />

        <GuiltFreeSection calculations={calculations} />

        <NotesSection
          notes={plan.notes ?? ""}
          onNotesChange={(notes) => debouncedUpdate({ notes })}
        />
      </div>
    </div>
  );
}
