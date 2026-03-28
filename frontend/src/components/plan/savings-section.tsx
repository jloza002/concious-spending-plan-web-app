"use client";

import { SectionHeader } from "./section-header";
import { LineItemRow } from "./line-item-row";
import { AddItemButton } from "./add-item-button";
import { TotalRow } from "./total-row";
import { SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanLineItem, PlanCalculations } from "@csp/shared";

interface SavingsSectionProps {
  items: PlanLineItem[];
  calculations: PlanCalculations;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange: (id: string, label: string) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
}

export function SavingsSection({
  items,
  calculations,
  onAmountChange,
  onLabelChange,
  onAddItem,
  onDeleteItem,
}: SavingsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.SAVINGS];

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader
        title={range.label}
        percentage={calculations.savingsPercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />

      {items.map((item) => (
        <LineItemRow
          key={item.id}
          item={item}
          onAmountChange={onAmountChange}
          onLabelChange={onLabelChange}
          onDelete={onDeleteItem}
        />
      ))}

      <AddItemButton onClick={onAddItem} />
      <TotalRow label="SAVINGS TOTAL" amount={calculations.savingsTotal} hasActions />
    </div>
  );
}
