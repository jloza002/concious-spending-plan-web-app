"use client";

import type { UserCategory } from "@csp/shared";

interface CategoryPickerProps {
  categories: UserCategory[];
  selectedIds: Set<string>;
  atCap: boolean;
  onToggle: (category: UserCategory) => void;
}

/**
 * The user's fixed-cost category library. Archived categories never reach this
 * list — the API filters them out — so anything here is selectable for a
 * future month.
 */
export function CategoryPicker({
  categories,
  selectedIds,
  atCap,
  onToggle,
}: CategoryPickerProps) {
  if (categories.length === 0) {
    return (
      <div className="px-4 py-5 text-sm font-sans text-gray-400 italic">
        No fixed-cost categories yet. Add some on a plan first.
      </div>
    );
  }

  return (
    <div>
      {categories.map((category) => {
        const checked = selectedIds.has(category.id);
        const blocked = atCap && !checked;

        return (
          <label
            key={category.id}
            className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 transition-colors ${
              blocked
                ? "opacity-40 cursor-not-allowed"
                : "cursor-pointer hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={blocked}
              onChange={() => onToggle(category)}
              className="w-4 h-4 shrink-0 accent-[var(--color-orange)] cursor-[inherit]
                focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:ring-offset-1"
            />
            <span className="flex-1 min-w-0 truncate text-sm font-sans text-gray-800">
              {category.label}
            </span>
            {blocked && (
              <span className="shrink-0 text-[11px] font-sans text-gray-400">
                Remove one to add another
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}
