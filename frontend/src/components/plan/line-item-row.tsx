"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { classifyOverUnder } from "@/lib/budget-display";
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
  /**
   * Turns on the Planned / Over-Under columns. Section-level: only Fixed Costs
   * sets it, so Investments and Savings render exactly as they always have.
   */
  showPlanned?: boolean;
  /** This category's budget for the month. Undefined means it isn't budgeted. */
  plannedAmount?: number;
}

const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Over budget is the bad direction, so it gets the warning colour.
 * Renders nothing for an unbudgeted category — the column stays blank until a
 * target exists to compare against, rather than labeling every unbudgeted row.
 */
function OverUnderChip({
  planned,
  actual,
}: {
  planned: number | undefined;
  actual: number;
}) {
  const base =
    "inline-block text-[11px] font-sans font-bold px-1.5 py-0.5 rounded-full tabular-nums whitespace-nowrap";
  const result = classifyOverUnder(planned, actual);

  switch (result.kind) {
    case "not-budgeted":
      return null;
    case "even":
      return <span className={`${base} bg-gray-100 text-gray-500`}>even</span>;
    case "over":
      return (
        <span className={`${base} bg-red-50 text-red-700`}>
          +{money(result.amount)}
        </span>
      );
    case "under":
      return (
        <span className={`${base} bg-green-50 text-green-700`}>
          &minus;{money(result.amount)}
        </span>
      );
  }
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
      showPlanned = false,
      plannedAmount,
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

          {/* Narrow screens can't fit four numeric columns, so the planned
              figure and its chip fold under the category name instead. */}
          {showPlanned && (
            <div className="sm:hidden mt-0.5 flex items-center gap-1.5">
              <span className="text-[11px] font-sans text-gray-400 tabular-nums whitespace-nowrap">
                {plannedAmount === undefined
                  ? "No budget"
                  : `Planned ${money(plannedAmount)}`}
              </span>
              <OverUnderChip planned={plannedAmount} actual={item.amount} />
            </div>
          )}
        </div>

        {/* Planned (desktop only — folded under the label on mobile) */}
        {showPlanned && (
          <div
            className={`hidden sm:block w-24 shrink-0 text-right text-sm font-sans tabular-nums text-gray-500 ${
              excluded ? "opacity-40 line-through" : ""
            }`}
          >
            {plannedAmount === undefined ? (
              <span className="text-gray-300">&mdash;</span>
            ) : (
              money(plannedAmount)
            )}
          </div>
        )}

        {/* Amount */}
        <div className={`w-28 sm:w-36 shrink-0 transition-opacity ${excluded ? "opacity-40 line-through" : ""}`}>
          <CurrencyInput
            value={item.amount}
            onChange={(amount) => onAmountChange(item.id, amount)}
            readOnly={readOnly}
          />
        </div>

        {/* Over / Under (desktop only — folded under the label on mobile) */}
        {showPlanned && (
          <div
            className={`hidden sm:flex w-24 shrink-0 justify-end ${
              excluded ? "opacity-40" : ""
            }`}
          >
            <OverUnderChip planned={plannedAmount} actual={item.amount} />
          </div>
        )}

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
