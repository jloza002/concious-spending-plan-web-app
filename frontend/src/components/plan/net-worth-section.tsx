"use client";

import { SectionHeader } from "./section-header";
import { CurrencyInput } from "@/components/ui/currency-input";
import { TotalRow } from "./total-row";

interface NetWorthSectionProps {
  assets: number;
  investmentsNw: number;
  savingsNw: number;
  debt: number;
  totalNetWorth: number;
  onFieldChange: (field: string, value: number) => void;
}

export function NetWorthSection({
  assets,
  investmentsNw,
  savingsNw,
  debt,
  totalNetWorth,
  onFieldChange,
}: NetWorthSectionProps) {
  const fields = [
    { key: "assets", label: "Assets", value: assets },
    { key: "investmentsNw", label: "Investments", value: investmentsNw },
    { key: "savingsNw", label: "Savings", value: savingsNw },
    { key: "debt", label: "Debt", value: debt },
  ];

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader title="NET WORTH" />
      {fields.map((field) => (
        <div
          key={field.key}
          className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100"
        >
          <span className="text-sm font-sans text-gray-800">{field.label}</span>
          <div className="w-28 sm:w-36 shrink-0">
            <CurrencyInput
              value={field.value}
              onChange={(val) => onFieldChange(field.key, val)}
            />
          </div>
        </div>
      ))}
      <TotalRow label="TOTAL NET WORTH" amount={totalNetWorth} />
    </div>
  );
}
