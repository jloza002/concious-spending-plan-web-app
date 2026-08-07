"use client";

import { useState } from "react";
import { SectionHeader } from "./section-header";
import { LineItemRow } from "./line-item-row";
import { CurrencyInput } from "@/components/ui/currency-input";
import type { PlanLineItem } from "@csp/shared";

interface IncomeSectionProps {
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  onFieldChange: (field: string, value: number) => void;
  /** This plan's income-section line items (the category list). */
  items: PlanLineItem[];
  /** Positive dollar total per income category label, from tagged deposits. */
  categoryTotals: Record<string, number>;
  /** True once at least one deposit is tagged Income — switches Net Income to auto-computed. */
  isAutoComputed: boolean;
  onToggleExclude: (id: string, excluded: boolean) => void;
}

export function IncomeSection({
  grossMonthlyIncome,
  netMonthlyIncome,
  onFieldChange,
  items,
  categoryTotals,
  isAutoComputed,
  onToggleExclude,
}: IncomeSectionProps) {
  // Only show income categories that actually have a tagged deposit — the full
  // list still lives on the line items (used by the transaction dropdown).
  const projected = items
    .filter((item) => categoryTotals[item.label] !== undefined)
    .map((item) => ({ ...item, amount: categoryTotals[item.label] ?? 0 }));

  // Collapsed by default: the total is the headline figure, and the
  // per-category breakdown is optional detail behind the arrow.
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader title="INCOME" />
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-sm font-sans text-gray-800">
          Gross monthly income
        </span>
        <div className="w-28 sm:w-36 shrink-0">
          <CurrencyInput
            value={grossMonthlyIncome}
            onChange={(val) => onFieldChange("grossMonthlyIncome", val)}
          />
        </div>
      </div>

      {isAutoComputed ? (
        <>
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            aria-expanded={showBreakdown}
            className="w-full flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5 font-sans font-bold text-sm text-[var(--color-orange)]">
              NET MONTHLY INCOME
              <span
                className={`text-[10px] text-gray-400 transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                aria-hidden="true"
              >
                ▼
              </span>
            </span>
            <div className="w-28 sm:w-36 shrink-0">
              <CurrencyInput
                value={netMonthlyIncome}
                onChange={() => {}}
                readOnly
                className="font-bold text-[var(--color-orange)]"
              />
            </div>
          </button>
          {showBreakdown && (
            <>
              {projected.map((item, i) => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  onAmountChange={() => {}}
                  onToggleExclude={onToggleExclude}
                  excludeTourAnchor={i === 0}
                  readOnly
                />
              ))}
            </>
          )}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-sans text-gray-500 italic">
            Auto-calculated from your tagged income transactions.{" "}
            {showBreakdown ? "" : "Click the total to see what it's made of. "}
            Untag a deposit on the Transactions tab to go back to entering
            this by hand.
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
            <span className="text-sm font-sans font-bold text-[var(--color-orange)]">
              Net monthly income (post-tax, after deductions)
            </span>
            <div className="w-28 sm:w-36 shrink-0">
              <CurrencyInput
                value={netMonthlyIncome}
                onChange={(val) => onFieldChange("netMonthlyIncome", val)}
                className="font-bold text-[var(--color-orange)]"
              />
            </div>
          </div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-sans text-gray-500 italic">
            Tag a deposit on the Transactions tab as Income to calculate this
            automatically.
          </div>
        </>
      )}
    </div>
  );
}
