"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { useState, useCallback } from "react";
import type { PlanLineItem } from "@csp/shared";

interface LineItemRowProps {
  item: PlanLineItem;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
  readOnly?: boolean;
}

/**
 * A single editable row in the spending plan.
 * Default items have read-only labels; custom items are fully editable.
 */
export function LineItemRow({
  item,
  onAmountChange,
  onLabelChange,
  onDelete,
  readOnly = false,
}: LineItemRowProps) {
  const [label, setLabel] = useState(item.label);

  const handleLabelBlur = useCallback(() => {
    if (label !== item.label && onLabelChange) {
      onLabelChange(item.id, label);
    }
  }, [label, item.id, item.label, onLabelChange]);

  return (
    <div
      className="flex items-center gap-2 sm:gap-3 px-4 py-2 bg-white border-b border-gray-100 group"
    >
      {/* Label */}
      <div className="flex-1 min-w-0">
        {item.isDefault || readOnly ? (
          <span className="text-sm font-sans text-gray-800 truncate block">
            {item.label}
          </span>
        ) : (
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            placeholder="Category name"
            className="w-full text-sm font-sans bg-transparent border-b border-transparent
              hover:border-gray-300 focus:border-[var(--color-orange)] focus:outline-none py-0.5"
          />
        )}
      </div>

      {/* Amount */}
      <div className="w-28 sm:w-36 shrink-0">
        <CurrencyInput
          value={item.amount}
          onChange={(amount) => onAmountChange(item.id, amount)}
          readOnly={readOnly}
        />
      </div>

      {/* Delete button — always reserves space so amount column stays aligned */}
      {!readOnly && onDelete ? (
        <button
          onClick={() => onDelete(item.id)}
          className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded text-gray-400
            hover:text-red-500 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
          title="Remove item"
        >
          &times;
        </button>
      ) : !readOnly ? (
        <div className="shrink-0 w-11 h-11 sm:w-6 sm:h-6" />
      ) : null}
    </div>
  );
}
