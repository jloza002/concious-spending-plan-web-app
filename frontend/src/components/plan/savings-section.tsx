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
import { AddItemButton } from "./add-item-button";
import { TotalRow } from "./total-row";
import { SECTION_RANGES, PLAN_SECTIONS } from "@csp/shared";
import type { PlanLineItem, PlanCalculations } from "@csp/shared";

interface SavingsSectionProps {
  items: PlanLineItem[];
  calculations: PlanCalculations;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange: (id: string, label: string) => void;
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onToggleExclude: (id: string, excluded: boolean) => void;
  onReorder: (items: { id: string; sortOrder: number }[]) => void;
}

export function SavingsSection({
  items,
  calculations,
  onAmountChange,
  onLabelChange,
  onAddItem,
  onDeleteItem,
  onToggleExclude,
  onReorder,
}: SavingsSectionProps) {
  const range = SECTION_RANGES[PLAN_SECTIONS.SAVINGS];

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
        percentage={calculations.savingsPercentage}
        minPercent={range.min / 100}
        maxPercent={range.max / 100}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, i) => (
            <SortableLineItem
              key={item.id}
              item={item}
              onAmountChange={onAmountChange}
              onLabelChange={onLabelChange}
              onDelete={onDeleteItem}
              onToggleExclude={onToggleExclude}
              excludeTourAnchor={i === 0}
            />
          ))}
        </SortableContext>
      </DndContext>

      <AddItemButton onClick={onAddItem} />
      <TotalRow label="SAVINGS TOTAL" amount={calculations.savingsTotal} hasActions />
    </div>
  );
}
