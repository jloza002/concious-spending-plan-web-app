"use client";

interface AddItemButtonProps {
  onClick: () => void;
  label?: string;
}

export function AddItemButton({
  onClick,
  label = "Add your own",
}: AddItemButtonProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 text-sm text-[var(--color-orange)] hover:bg-orange-50
        border-b border-dashed border-gray-200 transition-colors text-left font-sans"
    >
      + {label}
    </button>
  );
}
