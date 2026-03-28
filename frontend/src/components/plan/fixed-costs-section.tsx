"use client";

import { SectionHeader } from "./section-header";
import { TotalRow } from "./total-row";
import { CurrencyInput } from "@/components/ui/currency-input";
import { MISCELLANEOUS_RATE, SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanCalculations } from "@csp/shared";

interface FixedCostsSectionProps {
  categoryTotals: Record<string, number>;
  calculations: PlanCalculations;
}

export function FixedCostsSection({ categoryTotals, calculations }: FixedCostsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.FIXED_COSTS];
  const entries = Object.entries(categoryTotals).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader
        title={range.label}
        percentage={calculations.fixedCostsPercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />

      {entries.length === 0 ? (
        <div className="px-4 py-4 bg-white border-b border-gray-100 text-sm font-sans text-gray-400 italic">
          No fixed costs categorized yet. Categorize transactions on the Transactions tab.
        </div>
      ) : (
        entries.map(([label, amount]) => (
          <div
            key={label}
            className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100"
          >
            <span className="text-sm font-sans text-gray-800">{label}</span>
            <div className="w-28 sm:w-36 shrink-0">
              <CurrencyInput value={amount} onChange={() => {}} readOnly />
            </div>
          </div>
        ))
      )}

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
