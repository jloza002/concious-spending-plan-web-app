"use client";

import { use, useMemo } from "react";
import { usePlan, useUpdatePlan } from "@/hooks/use-spending-plan";
import { useUpdateLineItem, useAddLineItem, useDeleteLineItem } from "@/hooks/use-line-items";
import { useTransactions } from "@/hooks/use-transactions";
import { NetWorthSection } from "@/components/plan/net-worth-section";
import { IncomeSection } from "@/components/plan/income-section";
import { FixedCostsSection } from "@/components/plan/fixed-costs-section";
import { InvestmentsSection } from "@/components/plan/investments-section";
import { SavingsSection } from "@/components/plan/savings-section";
import { GuiltFreeSection } from "@/components/plan/guilt-free-section";
import { MISCELLANEOUS_RATE } from "@csp/shared";
import Link from "next/link";

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
  const { data: transactions } = useTransactions(planId);

  // Aggregate transaction amounts by fixed_costs subcategory
  const fixedCategoryTotals = useMemo<Record<string, number>>(() => {
    if (!transactions) return {};
    const totals: Record<string, number> = {};
    for (const t of transactions) {
      if (
        t.spendingCategory !== "fixed_costs" ||
        !t.spendingSubcategory ||
        t.isDuplicate ||
        t.type === "Payment"
      ) continue;
      totals[t.spendingSubcategory] = (totals[t.spendingSubcategory] ?? 0) + (-t.amount);
    }
    return totals;
  }, [transactions]);

  // Override plan calculations with transaction-based fixed costs
  const calculations = useMemo(() => {
    if (!plan) return null;
    const net = plan.netMonthlyIncome;
    const fixedCostsSubtotal = Object.values(fixedCategoryTotals).reduce((s, v) => s + v, 0);
    const miscellaneous = fixedCostsSubtotal * MISCELLANEOUS_RATE;
    const fixedCostsTotal = fixedCostsSubtotal + miscellaneous;
    const { investmentsTotal, savingsTotal } = plan.calculations;
    const guiltFreeTotal = net - fixedCostsTotal - investmentsTotal - savingsTotal;
    return {
      ...plan.calculations,
      fixedCostsSubtotal,
      miscellaneous,
      fixedCostsTotal,
      fixedCostsPercentage: net > 0 ? fixedCostsTotal / net : 0,
      guiltFreeTotal,
      guiltFreePercentage: net > 0 ? guiltFreeTotal / net : 0,
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
        Failed to load plan. <Link href="/dashboard" className="underline">Back to dashboard</Link>
      </div>
    );
  }

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

  return (
    <div>
      <div className="text-right mb-2">
        <span className={`text-xs text-gray-400 font-sans transition-opacity duration-150 ${isSaving ? "opacity-100" : "opacity-0"}`}>Saving...</span>
      </div>

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
          categoryTotals={fixedCategoryTotals}
          calculations={calculations}
        />

        <InvestmentsSection
          items={investmentItems}
          calculations={calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("investments")}
          onDeleteItem={handleDeleteItem}
        />

        <SavingsSection
          items={savingsItems}
          calculations={calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("savings")}
          onDeleteItem={handleDeleteItem}
        />

        <GuiltFreeSection calculations={calculations} />
      </div>
    </div>
  );
}
