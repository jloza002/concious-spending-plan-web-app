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
  calculations: PlanCalculations;
  includeMiscellaneous: boolean;
  onDeleteMiscellaneous: () => void;
  onReorder: (items: { id: string; sortOrder: number }[]) => void;
}

export function FixedCostsSection({
  items,
  categoryTotals,
  calculations,
  includeMiscellaneous,
  onDeleteMiscellaneous,
  onReorder,
}: FixedCostsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.FIXED_COSTS];

  // Project each line item into a read-only row using the transaction-derived amount
  const projected = items.map((item) => ({
    ...item,
    amount: categoryTotals[item.label] ?? 0,
  }));

  // Subcategory totals from transactions that don't match any line item
  const itemLabels = new Set(items.map((i) => i.label));
  const orphans = Object.entries(categoryTotals)
    .filter(([label]) => !itemLabels.has(label))
    .sort(([a], [b]) => a.localeCompare(b));

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

      {projected.length === 0 && orphans.length === 0 ? (
        <div className="px-4 py-4 bg-white border-b border-gray-100 text-sm font-sans text-gray-400 italic">
          No fixed costs categorized yet. Categorize transactions on the Transactions tab.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={projected.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {projected.map((item) => (
              <SortableLineItem
                key={item.id}
                item={item}
                onAmountChange={() => {}}
                onLabelChange={() => {}}
                onDelete={() => {}}
                readOnly
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {orphans.length > 0 && (
        <>
          {orphans.map(([label, amount]) => (
            <div
              key={`orphan:${label}`}
              className="flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-100"
              title="Subcategory used in transactions but not in this plan's categories"
            >
              <span className="text-sm font-sans text-amber-800 italic">
                {label} <span className="text-[10px] uppercase tracking-wide">orphan</span>
              </span>
              <div className="w-28 sm:w-36 shrink-0">
                <CurrencyInput value={amount} onChange={() => {}} readOnly />
              </div>
            </div>
          ))}
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
