"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { useState, useCallback, forwardRef } from "react";
import type { PlanLineItem } from "@csp/shared";

interface LineItemRowProps {
  item: PlanLineItem;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange?: (id: string, label: string) => void;
  onDelete?: (id: string) => void;
  onToggleExclude?: (id: string, excluded: boolean) => void;
  readOnly?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  style?: React.CSSProperties;
  /** Attaches a tour anchor to the first row's exclude toggle. */
  excludeTourAnchor?: boolean;
}

function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {off ? (
        <>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
          <path d="M6.61 6.61A13.5 13.5 0 0 0 2 12s3 8 10 8a9.12 9.12 0 0 0 5.39-1.61" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </>
      ) : (
        <>
          <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

/**
 * A single editable row in the spending plan.
 * Default items have read-only labels; custom items are fully editable.
 */
export const LineItemRow = forwardRef<HTMLDivElement, LineItemRowProps>(
  function LineItemRow(
    {
      item,
      onAmountChange,
      onLabelChange,
      onDelete,
      onToggleExclude,
      readOnly = false,
      dragHandleProps,
      style,
      excludeTourAnchor,
      ...rest
    },
    ref
  ) {
    const [label, setLabel] = useState(item.label);
    const excluded = item.excluded;

    const handleLabelBlur = useCallback(() => {
      if (label !== item.label && onLabelChange) {
        onLabelChange(item.id, label);
      }
    }, [label, item.id, item.label, onLabelChange]);

    return (
      <div
        ref={ref}
        style={style}
        className="flex items-center gap-2 sm:gap-3 px-4 py-2 bg-white border-b border-gray-100 group"
        {...rest}
      >
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            type="button"
            className="shrink-0 w-6 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
            {...dragHandleProps}
          >
            <svg width="12" height="18" viewBox="0 0 12 18" fill="currentColor">
              <circle cx="3" cy="3" r="1.5" />
              <circle cx="9" cy="3" r="1.5" />
              <circle cx="3" cy="9" r="1.5" />
              <circle cx="9" cy="9" r="1.5" />
              <circle cx="3" cy="15" r="1.5" />
              <circle cx="9" cy="15" r="1.5" />
            </svg>
          </button>
        )}

        {/* Label */}
        <div className={`flex-1 min-w-0 transition-opacity ${excluded ? "opacity-40" : ""}`}>
          {item.isDefault || readOnly ? (
            <span className={`text-sm font-sans text-gray-800 truncate block ${excluded ? "line-through" : ""}`}>
              {item.label}
            </span>
          ) : (
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleLabelBlur}
              placeholder="Category name"
              className={`w-full text-sm font-sans bg-transparent border-b border-transparent
                hover:border-gray-300 focus:border-[var(--color-orange)] focus:outline-none py-0.5 ${excluded ? "line-through" : ""}`}
            />
          )}
        </div>

        {/* Amount */}
        <div className={`w-28 sm:w-36 shrink-0 transition-opacity ${excluded ? "opacity-40 line-through" : ""}`}>
          <CurrencyInput
            value={item.amount}
            onChange={(amount) => onAmountChange(item.id, amount)}
            readOnly={readOnly}
          />
        </div>

        {/* Exclude / include toggle */}
        {onToggleExclude && (
          <button
            type="button"
            onClick={() => onToggleExclude(item.id, !excluded)}
            data-tour={excludeTourAnchor ? "exclude-line" : undefined}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded transition-colors ${
              excluded
                ? "text-[var(--color-orange)] hover:bg-orange-50"
                : "text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            }`}
            title={excluded ? "Include in totals" : "Exclude from totals (what-if)"}
          >
            <EyeIcon off={excluded} />
          </button>
        )}

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
);
