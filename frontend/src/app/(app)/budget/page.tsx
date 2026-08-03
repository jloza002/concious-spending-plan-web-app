"use client";

import { useMemo, useState } from "react";
import { MAX_BUDGET_CATEGORIES } from "@csp/shared";
import type { UserCategory } from "@csp/shared";
import { useBudgetTargets, useSetBudgetTargets } from "@/hooks/use-budget-targets";
import { useUserCategories } from "@/hooks/use-user-categories";
import { CategoryPicker } from "@/components/budget/category-picker";
import { BudgetTargetRow } from "@/components/budget/budget-target-row";
import { MONTH_NAMES, shiftMonth } from "@/lib/month";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export default function BudgetPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());

  const previous = shiftMonth(month, year, -1);

  const { data: allCategories, isLoading: categoriesLoading } = useUserCategories();
  const { data: targets, isLoading: targetsLoading } = useBudgetTargets(month, year);
  const { data: previousTargets } = useBudgetTargets(previous.month, previous.year);
  const { save, isPending, error } = useSetBudgetTargets(month, year);

  const fixedCostCategories = useMemo(
    () => (allCategories ?? []).filter((c) => c.section === "fixed_costs"),
    [allCategories]
  );

  const rows = useMemo(() => targets ?? [], [targets]);
  const selectedIds = useMemo(
    () => new Set(rows.map((t) => t.userCategoryId)),
    [rows]
  );
  const activeIds = useMemo(
    () => new Set(fixedCostCategories.map((c) => c.id)),
    [fixedCostCategories]
  );

  const total = rows.reduce((sum, t) => sum + t.amount, 0);
  const atCap = rows.length >= MAX_BUDGET_CATEGORIES;

  // The cache is the single source of truth: `save` writes to it optimistically,
  // so there is no second copy of this list to keep in sync. Every handler uses
  // the updater form so that toggling several rows quickly can't lose edits.
  function handleToggle(category: UserCategory) {
    save((current) => {
      if (current.some((d) => d.userCategoryId === category.id)) {
        return current.filter((d) => d.userCategoryId !== category.id);
      }
      if (current.length >= MAX_BUDGET_CATEGORIES) return current;
      return [
        ...current,
        { userCategoryId: category.id, label: category.label, amount: 0 },
      ];
    });
  }

  function handleAmountChange(userCategoryId: string, amount: number) {
    save((current) =>
      current.map((d) =>
        d.userCategoryId === userCategoryId ? { ...d, amount } : d
      )
    );
  }

  function handleRemove(userCategoryId: string) {
    save((current) =>
      current.filter((d) => d.userCategoryId !== userCategoryId)
    );
  }

  function handleCopyPrevious() {
    // Skip anything archived since last month — it can't be re-budgeted.
    save(
      (previousTargets ?? [])
        .filter((t) => activeIds.has(t.userCategoryId))
        .slice(0, MAX_BUDGET_CATEGORIES)
        .map((t) => ({
          userCategoryId: t.userCategoryId,
          label: t.label,
          amount: t.amount,
        }))
    );
  }

  const canCopyPrevious =
    rows.length === 0 &&
    (previousTargets ?? []).some((t) => activeIds.has(t.userCategoryId));

  function step(delta: number) {
    const next = shiftMonth(month, year, delta);
    setMonth(next.month);
    setYear(next.year);
  }

  if (categoriesLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading your categories...
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
          Budget
        </h1>
        <p className="mt-1 text-sm font-sans text-gray-500">
          Pick up to {MAX_BUDGET_CATEGORIES}{" "}
          fixed-cost categories a month and set what you plan to spend. These
          become the &ldquo;planned&rdquo; figures on your plan and dashboard.
        </p>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous month"
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 bg-white
            text-[var(--color-dark-teal)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]"
        >
          &#9664;
        </button>
        <span className="font-display text-lg font-bold text-[var(--color-dark-teal)] min-w-[9.5rem] text-center">
          {MONTH_NAMES[month - 1]} {year}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label="Next month"
          className="w-9 h-9 flex items-center justify-center rounded-md border border-gray-300 bg-white
            text-[var(--color-dark-teal)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]"
        >
          &#9654;
        </button>

        <div className="ml-auto flex items-center gap-3">
          {canCopyPrevious && (
            <button
              type="button"
              onClick={handleCopyPrevious}
              className="text-xs font-sans font-semibold px-3 py-1.5 rounded-md border border-gray-300 bg-white
                text-[var(--color-dark-teal)] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]"
            >
              Copy {MONTH_NAMES[previous.month - 1]}&rsquo;s budget
            </button>
          )}
          <span
            className={`text-xs font-sans font-bold px-2.5 py-1 rounded-full ${
              atCap
                ? "bg-[var(--color-orange)] text-white"
                : "bg-[var(--color-warm-beige)] text-[var(--color-dark-teal)]"
            }`}
          >
            {rows.length} / {MAX_BUDGET_CATEGORIES} categories
          </span>
        </div>
      </div>

      {error && (
        <p className="mb-3 text-sm font-sans text-red-500">
          {error.message} — your last change was undone.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-4">
        {/* Category library */}
        <div className="rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="bg-[var(--color-dark-teal)] px-4 py-3 flex items-center justify-between">
            <h2 className="font-display text-white font-bold text-base">
              Your categories
            </h2>
            <span className="text-xs font-sans text-white/60">fixed costs</span>
          </div>
          <CategoryPicker
            categories={fixedCostCategories}
            selectedIds={selectedIds}
            atCap={atCap}
            onToggle={handleToggle}
          />
        </div>

        {/* This month's budget */}
        <div className="rounded-lg overflow-hidden shadow-sm bg-white">
          <div className="bg-[var(--color-dark-teal)] px-4 py-3 flex items-center justify-between">
            <h2 className="font-display text-white font-bold text-base">
              {MONTH_NAMES[month - 1]} {year} budget
            </h2>
            <span className="text-xs font-sans text-white/60">
              {isPending ? "Saving..." : "Auto-saved"}
            </span>
          </div>

          {targetsLoading ? (
            <div className="px-4 py-5 text-sm font-sans text-gray-400 italic">
              Loading this month&rsquo;s budget...
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-5 text-sm font-sans text-gray-400 italic">
              Nothing budgeted for {MONTH_NAMES[month - 1]} yet. Tick a category to
              start.
            </div>
          ) : (
            <>
              {rows.map((target) => (
                <BudgetTargetRow
                  key={target.userCategoryId}
                  label={target.label}
                  amount={target.amount}
                  archived={!activeIds.has(target.userCategoryId)}
                  onAmountChange={(amount) =>
                    handleAmountChange(target.userCategoryId, amount)
                  }
                  onRemove={() => handleRemove(target.userCategoryId)}
                />
              ))}
              <div className="flex items-center gap-2 sm:gap-3 px-4 py-2.5 bg-[var(--color-warm-beige)]">
                <span className="flex-1 font-sans font-bold text-xs tracking-wider text-[var(--color-dark-teal)]">
                  BUDGETED TOTAL
                </span>
                <span className="w-28 sm:w-36 shrink-0 text-right font-sans font-bold text-sm tabular-nums text-[var(--color-dark-teal)]">
                  {fmt(total)}
                </span>
                <span className="w-11 sm:w-8 shrink-0" />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
