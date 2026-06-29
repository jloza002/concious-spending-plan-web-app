"use client";

interface SectionHeaderProps {
  title: string;
  percentage?: number;
  minPercent?: number;
  maxPercent?: number;
}

/** Clamp a 0–1 ratio to a 0–100 percentage of the track. */
function toPct(ratio: number): number {
  return Math.max(0, Math.min(100, ratio * 100));
}

/**
 * Dark teal section header matching the Excel template.
 * Shows the title and percentage, plus a progress bar with the IWT target
 * range so you can see at a glance whether the section is on track.
 */
export function SectionHeader({
  title,
  percentage,
  minPercent,
  maxPercent,
}: SectionHeaderProps) {
  const hasPercentage = percentage !== undefined && !isNaN(percentage);
  const roundedPct = hasPercentage ? Math.round(percentage * 100) : 0;
  const showBar = hasPercentage && minPercent !== undefined && maxPercent !== undefined;

  const fillPct = hasPercentage ? toPct(percentage) : 0;
  const bandStart = showBar ? toPct(minPercent!) : 0;
  const bandEnd = showBar ? toPct(maxPercent!) : 0;
  const bandWidth = Math.max(0, bandEnd - bandStart);

  // Status relative to the recommended band. Single-point targets (min === max,
  // e.g. Investments 10%) count as on target once you reach the target or more;
  // ranges count as on target when you land inside the band.
  const belowTarget = showBar && percentage! < minPercent!;
  const overTarget = showBar && minPercent !== maxPercent && percentage! > maxPercent!;
  const onTarget = showBar && !belowTarget && !overTarget;

  const EMERALD = "#34D399";
  const AMBER = "#FBBF24";
  const statusColor = onTarget ? EMERALD : overTarget ? AMBER : "var(--color-orange)";
  const statusText = onTarget ? "On target" : overTarget ? "Over target" : "Below target";

  const targetLabel = showBar
    ? minPercent === maxPercent
      ? `Target ${Math.round(minPercent! * 100)}%`
      : `Target ${Math.round(minPercent! * 100)}–${Math.round(maxPercent! * 100)}%`
    : "";

  return (
    <div className="bg-[var(--color-dark-teal)] px-4 py-3 rounded-t-lg">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-white font-bold text-lg">{title}</h3>
        {hasPercentage && roundedPct !== 0 && (
          <span
            className="font-sans font-bold text-lg"
            style={{ color: showBar ? statusColor : "var(--color-orange)" }}
          >
            {roundedPct}%
          </span>
        )}
      </div>

      {showBar && (
        <div className="mt-2">
          <div
            className="relative h-2 rounded-full bg-white/15 overflow-hidden"
            title={`${roundedPct}% of net income · recommended ${targetLabel.replace("Target ", "")}`}
          >
            {/* recommended target band */}
            {bandWidth > 0 ? (
              <div
                className="absolute top-0 bottom-0 bg-white/25"
                style={{ left: `${bandStart}%`, width: `${bandWidth}%` }}
              />
            ) : (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                style={{ left: `${bandStart}%` }}
              />
            )}
            {/* actual fill */}
            <div
              className="absolute top-0 bottom-0 left-0 rounded-full transition-[width] duration-300"
              style={{ width: `${fillPct}%`, backgroundColor: statusColor }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[10px] font-sans text-white/60">
            <span>{targetLabel}</span>
            <span style={{ color: statusColor }}>{statusText}</span>
          </div>
        </div>
      )}
    </div>
  );
}
