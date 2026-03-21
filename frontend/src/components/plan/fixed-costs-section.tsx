"use client";

import { SectionHeader } from "./section-header";
import { LineItemRow } from "./line-item-row";
import { TotalRow } from "./total-row";
import { CurrencyInput } from "@/components/ui/currency-input";
import { MISCELLANEOUS_RATE, SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanLineItem, PlanCalculations } from "@csp/shared";

interface FixedCostsSectionProps {
  items: PlanLineItem[];
  calculations: PlanCalculations;
}

export function FixedCostsSection({ items, calculations }: FixedCostsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.FIXED_COSTS];

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader
        title={range.label}
        percentage={calculations.fixedCostsPercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />

      {items.map((item) => (
        <LineItemRow
          key={item.id}
          item={item}
          onAmountChange={() => {}}
          readOnly
        />
      ))}

      {/* Miscellaneous (auto-calculated) */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-sm font-sans italic text-gray-500">
          Miscellaneous (automatically adds {Math.round(MISCELLANEOUS_RATE * 100)}%)
        </span>
        <div className="w-36 shrink-0">
          <CurrencyInput
            value={calculations.miscellaneous}
            onChange={() => {}}
            readOnly
            className="text-gray-500 italic"
          />
        </div>
      </div>

      <TotalRow label="FIXED COSTS TOTAL" amount={calculations.fixedCostsTotal} />
    </div>
  );
}
