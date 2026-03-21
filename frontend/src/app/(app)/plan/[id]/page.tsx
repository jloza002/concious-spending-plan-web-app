"use client";

import { use } from "react";
import { usePlan, useUpdatePlan } from "@/hooks/use-spending-plan";
import { useUpdateLineItem, useAddLineItem, useDeleteLineItem } from "@/hooks/use-line-items";
import { NetWorthSection } from "@/components/plan/net-worth-section";
import { IncomeSection } from "@/components/plan/income-section";
import { FixedCostsSection } from "@/components/plan/fixed-costs-section";
import { InvestmentsSection } from "@/components/plan/investments-section";
import { SavingsSection } from "@/components/plan/savings-section";
import { GuiltFreeSection } from "@/components/plan/guilt-free-section";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading plan...
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="text-center py-12 text-red-500 font-sans">
        Failed to load plan. <Link href="/dashboard" className="underline">Back to dashboard</Link>
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
    addItem.mutate({ section, label: "", amount: 0 });
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate(id);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 font-sans"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mt-1">
            {MONTH_NAMES[plan.month - 1]} {plan.year}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isSaving && (
            <span className="text-xs text-gray-400 font-sans">Saving...</span>
          )}
          <Link href={`/plan/${planId}/import`}>
            <Button variant="secondary" size="sm">
              Import CSV
            </Button>
          </Link>
          <Link href={`/plan/${planId}/preview`}>
            <Button size="sm">Preview & Export</Button>
          </Link>
        </div>
      </div>

      {/* Spending Plan Form */}
      <div className="max-w-2xl mx-auto space-y-6">
        <NetWorthSection
          assets={plan.assets}
          investmentsNw={plan.investmentsNw}
          savingsNw={plan.savingsNw}
          debt={plan.debt}
          totalNetWorth={plan.calculations.totalNetWorth}
          onFieldChange={handleFieldChange}
        />

        <IncomeSection
          grossMonthlyIncome={plan.grossMonthlyIncome}
          netMonthlyIncome={plan.netMonthlyIncome}
          onFieldChange={handleFieldChange}
        />

        <FixedCostsSection
          items={fixedCostItems}
          calculations={plan.calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("fixed_costs")}
          onDeleteItem={handleDeleteItem}
        />

        <InvestmentsSection
          items={investmentItems}
          calculations={plan.calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("investments")}
          onDeleteItem={handleDeleteItem}
        />

        <SavingsSection
          items={savingsItems}
          calculations={plan.calculations}
          onAmountChange={handleAmountChange}
          onLabelChange={handleLabelChange}
          onAddItem={() => handleAddItem("savings")}
          onDeleteItem={handleDeleteItem}
        />

        <GuiltFreeSection calculations={plan.calculations} />
      </div>
    </div>
  );
}
