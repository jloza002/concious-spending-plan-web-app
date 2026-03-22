"use client";

import { CurrencyInput } from "@/components/ui/currency-input";

interface TotalRowProps {
  label: string;
  amount: number;
  variant?: "default" | "negative";
  hasActions?: boolean;
}

export function TotalRow({ label, amount, variant = "default", hasActions = false }: TotalRowProps) {
  const isNegative = variant === "negative" || amount < 0;

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-200">
      <span
        className={`font-sans font-bold text-sm ${isNegative ? "text-red-500" : "text-[var(--color-orange)]"}`}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        <div className="w-36 shrink-0">
          <CurrencyInput
            value={amount}
            onChange={() => {}}
            readOnly
            className={`font-bold ${isNegative ? "text-red-500" : "text-[var(--color-orange)]"}`}
          />
        </div>
        {hasActions && <div className="shrink-0 w-6 h-6" />}
      </div>
    </div>
  );
}
