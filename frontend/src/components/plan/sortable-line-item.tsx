"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LineItemRow } from "./line-item-row";
import type { PlanLineItem } from "@csp/shared";

interface SortableLineItemProps {
  item: PlanLineItem;
  onAmountChange: (id: string, amount: number) => void;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
}

export function SortableLineItem({
  item,
  onAmountChange,
  onLabelChange,
  onDelete,
}: SortableLineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <LineItemRow
      ref={setNodeRef}
      style={style}
      item={item}
      onAmountChange={onAmountChange}
      onLabelChange={onLabelChange}
      onDelete={onDelete}
      dragHandleProps={{ ...attributes, ...listeners }}
    />
  );
}
