"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { useState, useCallback } from "react";
import type { PlanLineItem } from "@csp/shared";

interface LineItemRowProps {
  item: PlanLineItem;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
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
}: LineItemRowProps) {
  const [label, setLabel] = useState(item.label);
  const [isHovered, setIsHovered] = useState(false);

  const handleLabelBlur = useCallback(() => {
    if (label !== item.label && onLabelChange) {
      onLabelChange(item.id, label);
    }
  }, [label, item.id, item.label, onLabelChange]);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2 bg-white border-b border-gray-100 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Label */}
      <div className="flex-1 min-w-0">
        {item.isDefault ? (
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
      <div className="w-36 shrink-0">
        <CurrencyInput
          value={item.amount}
          onChange={(amount) => onAmountChange(item.id, amount)}
        />
      </div>

      {/* Delete button (custom items only) */}
      {!item.isDefault && onDelete && (
        <button
          onClick={() => onDelete(item.id)}
          className={`shrink-0 w-6 h-6 flex items-center justify-center rounded text-gray-400
            hover:text-red-500 hover:bg-red-50 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}
          title="Remove item"
        >
          &times;
        </button>
      )}
    </div>
  );
}
