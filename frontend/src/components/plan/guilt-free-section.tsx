"use client";

import { SectionHeader } from "./section-header";
import { TotalRow } from "./total-row";
import { SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanCalculations } from "@csp/shared";

interface GuiltFreeSectionProps {
  calculations: PlanCalculations;
}

export function GuiltFreeSection({ calculations }: GuiltFreeSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.GUILT_FREE];
  const isNegative = calculations.guiltFreeTotal < 0;

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader
        title={range.label}
        percentage={calculations.guiltFreePercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />
      <TotalRow
        label="GUILT-FREE SPENDING TOTAL"
        amount={calculations.guiltFreeTotal}
        variant={isNegative ? "negative" : "default"}
      />
      {isNegative && (
        <div className="px-4 py-2 bg-red-50 text-red-600 text-sm font-sans">
          Your planned spending exceeds your net income. Consider reducing costs
          in other categories.
        </div>
      )}
    </div>
  );
}
