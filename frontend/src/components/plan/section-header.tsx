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
  minPercent,
  maxPercent,
}: SectionHeaderProps) {
  const isInRange =
    percentage !== undefined &&
    minPercent !== undefined &&
    maxPercent !== undefined &&
    percentage >= minPercent &&
    percentage <= maxPercent;

  const percentColor =
    percentage === undefined
      ? "text-white"
      : isInRange
        ? "text-green-400"
        : "text-[var(--color-orange)]";

  return (
    <div className="flex items-center justify-between bg-[var(--color-dark-teal)] px-4 py-3 rounded-t-lg">
      <h3 className="font-display text-white font-bold text-lg">{title}</h3>
      {percentage !== undefined && (
        <span className={`font-sans font-bold text-lg ${percentColor}`}>
          {Math.round(percentage * 100)}%
        </span>
      )}
    </div>
  );
}
