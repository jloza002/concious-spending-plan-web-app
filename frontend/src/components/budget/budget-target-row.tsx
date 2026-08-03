"use client";

import { CurrencyInput } from "@/components/ui/currency-input";

interface BudgetTargetRowProps {
  label: string;
  amount: number;
  /** Category was removed from the library after this month was budgeted. */
  archived?: boolean;
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
}

export function BudgetTargetRow({
  label,
  amount,
  archived = false,
  onAmountChange,
  onRemove,
}: BudgetTargetRowProps) {
  return (
    <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 bg-white border-b border-gray-100 group">
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-sans text-gray-800 truncate">{label}</span>
        {archived && (
          <span
            className="shrink-0 text-[10px] font-sans font-semibold px-1.5 py-0.5 rounded-full
              bg-[var(--color-warm-beige)] text-[var(--color-dark-teal)]"
            title="This category was removed from your library. Past months keep it."
          >
            archived
          </span>
        )}
      </div>

      <div className="w-28 sm:w-36 shrink-0">
        <CurrencyInput value={amount} onChange={onAmountChange} />
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} from this month's budget`}
        className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded text-gray-400
          hover:text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]
          opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100 transition-opacity"
        title="Remove from this month"
      >
        &times;
      </button>
    </div>
  );
}
