"use client";

import { SectionHeader } from "./section-header";
import { CurrencyInput } from "@/components/ui/currency-input";

interface IncomeSectionProps {
  grossMonthlyIncome: number;
  netMonthlyIncome: number;
  onFieldChange: (field: string, value: number) => void;
}

export function IncomeSection({
  grossMonthlyIncome,
  netMonthlyIncome,
  onFieldChange,
}: IncomeSectionProps) {
  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader title="INCOME" />
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <span className="text-sm font-sans text-gray-800">
          Gross monthly income
        </span>
        <div className="w-36 shrink-0">
          <CurrencyInput
            value={grossMonthlyIncome}
            onChange={(val) => onFieldChange("grossMonthlyIncome", val)}
          />
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <span className="text-sm font-sans font-bold text-[var(--color-orange)]">
          Net monthly income (post-tax, after deductions)
        </span>
        <div className="w-36 shrink-0">
          <CurrencyInput
            value={netMonthlyIncome}
            onChange={(val) => onFieldChange("netMonthlyIncome", val)}
            className="font-bold text-[var(--color-orange)]"
          />
        </div>
      </div>
    </div>
  );
}
