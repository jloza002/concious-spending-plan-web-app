"use client";

interface SectionHeaderProps {
  title: string;
  percentage?: number;
  minPercent?: number;
  maxPercent?: number;
}

/**
 * Dark teal section header matching the Excel template.
 * Shows title on left and percentage badge on right.
 */
export function SectionHeader({
  title,
  percentage,
}: SectionHeaderProps) {
  const roundedPct = percentage !== undefined ? Math.round(percentage * 100) : 0;
  const showPercentage = percentage !== undefined && roundedPct !== 0 && !isNaN(percentage);

  return (
    <div className="flex items-center justify-between bg-[var(--color-dark-teal)] px-4 py-3 rounded-t-lg">
      <h3 className="font-display text-white font-bold text-lg">{title}</h3>
      {showPercentage && (
        <span className="font-sans font-bold text-lg text-[var(--color-orange)]">
          {roundedPct}%
        </span>
      )}
    </div>
  );
}
