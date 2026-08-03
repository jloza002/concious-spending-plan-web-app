"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SectionHeader } from "./section-header";
import { SortableLineItem } from "./sortable-line-item";
import { TotalRow } from "./total-row";
import { CurrencyInput } from "@/components/ui/currency-input";
import { MISCELLANEOUS_RATE, SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanCalculations, PlanLineItem } from "@csp/shared";

interface FixedCostsSectionProps {
  items: PlanLineItem[];
  categoryTotals: Record<string, number>;
  /** Budgeted amount per category label for this plan's month. */
  plannedAmounts: Record<string, number>;
  calculations: PlanCalculations;
  includeMiscellaneous: boolean;
  onDeleteMiscellaneous: () => void;
  onToggleExclude: (id: string, excluded: boolean) => void;
  onReorder: (items: { id: string; sortOrder: number }[]) => void;
}

export function FixedCostsSection({
  items,
  categoryTotals,
  plannedAmounts,
  calculations,
  includeMiscellaneous,
  onDeleteMiscellaneous,
  onToggleExclude,
  onReorder,
}: FixedCostsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.FIXED_COSTS];

  // Show a category if it has categorized transactions OR a budget for this
  // month. The full category list still lives on the line items (used by the
  // transaction category dropdown); a budgeted category with nothing spent yet
  // has to appear too, otherwise the budget silently goes missing here.
  const projected = items
    .filter(
      (item) =>
        categoryTotals[item.label] !== undefined ||
        plannedAmounts[item.label] !== undefined
    )
    .map((item) => ({
      ...item,
      amount: categoryTotals[item.label] ?? 0,
    }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    onReorder(reordered.map((item, i) => ({ id: item.id, sortOrder: i })));
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-sm">
      <SectionHeader
        title={range.label}
        percentage={calculations.fixedCostsPercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />

      {projected.length === 0 ? (
        <div className="px-4 py-4 bg-white border-b border-gray-100 text-sm font-sans text-gray-400 italic">
          No fixed costs categorized yet. Categorize transactions on the Transactions tab,
          or set targets on the Budget page.
        </div>
      ) : (
        <>
          {/* Column header. Widths mirror the cells in LineItemRow. */}
          <div className="hidden sm:flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-b border-gray-100
            text-[10px] font-sans font-bold uppercase tracking-wider text-gray-400">
            <span className="flex-1">Category</span>
            <span className="w-24 shrink-0 text-right">Planned</span>
            <span className="w-36 shrink-0 text-right">Actual</span>
            <span className="w-24 shrink-0 text-right">Over / Under</span>
            {/* Matches the row's exclude toggle so the columns line up. */}
            <span className="w-8 shrink-0" />
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={projected.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              {projected.map((item, i) => (
                <SortableLineItem
                  key={item.id}
                  item={item}
                  onAmountChange={() => {}}
                  onLabelChange={() => {}}
                  onDelete={() => {}}
                  onToggleExclude={onToggleExclude}
                  excludeTourAnchor={i === 0}
                  showPlanned
                  plannedAmount={plannedAmounts[item.label]}
                  readOnly
                />
              ))}
            </SortableContext>
          </DndContext>
        </>
      )}

      {/* Miscellaneous (auto-calculated) */}
      {includeMiscellaneous && (
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 group">
          <span className="flex-1 text-sm font-sans italic text-gray-500">
            Miscellaneous (automatically adds {Math.round(MISCELLANEOUS_RATE * 100)}%)
          </span>
          <div className="w-28 sm:w-36 shrink-0">
            <CurrencyInput
              value={calculations.miscellaneous}
              onChange={() => {}}
              readOnly
              className="text-gray-500 italic"
            />
          </div>
          <button
            onClick={onDeleteMiscellaneous}
            className="shrink-0 w-11 h-11 sm:w-8 sm:h-8 flex items-center justify-center rounded text-gray-400
              hover:text-red-500 hover:bg-red-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            title="Remove miscellaneous"
          >
            &times;
          </button>
        </div>
      )}

      <TotalRow label="FIXED COSTS TOTAL" amount={calculations.fixedCostsTotal} />
    </div>
  );
}
