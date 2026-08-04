"use client";

interface AddItemButtonProps {
  onClick: () => void;
  label?: string;
  /**
   * True while the add is in flight. The next label is computed from the
   * current category list at click time, so two clicks close enough together
   * to both fire before either request returns would compute the same label
   * and the second would silently collide server-side — disabling closes
   * that window without needing to coordinate anything across requests.
   */
  disabled?: boolean;
}

export function AddItemButton({
  onClick,
  label = "Add your own",
  disabled = false,
}: AddItemButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full px-4 py-3 text-sm text-[var(--color-orange)] hover:bg-orange-50
        border-b border-dashed border-gray-200 transition-colors text-left font-sans
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      + {label}
    </button>
  );
}
