"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMarkTourSeen, useSeenTours } from "@/hooks/use-seen-tours";
import { ANNOUNCEMENTS } from "./announcements";

/**
 * One-time "what's new" popup for newly shipped frontend features.
 *
 * Reuses the account-scoped seenTours store rather than localStorage, so an
 * announcement does not re-appear on a second device. Only the first unseen
 * announcement is shown per sign-in — a queue of popups would be worse than
 * the feature it is advertising.
 */
export function WhatsNewModal() {
  const { data: seen, isLoading } = useSeenTours();
  const markSeen = useMarkTourSeen();
  const [dismissed, setDismissed] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const announcement = useMemo(() => {
    if (isLoading || !seen) return null;
    return ANNOUNCEMENTS.find((a) => !seen.includes(a.id)) ?? null;
  }, [isLoading, seen]);

  const open = !!announcement && !dismissed;

  const dismiss = useCallback(() => {
    if (!announcement) return;
    setDismissed(true);
    markSeen.mutate(announcement.id);
  }, [announcement, markSeen]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open || !announcement) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="absolute inset-0 bg-[rgba(15,28,27,0.6)]" />

      <div className="relative w-full max-w-md rounded-2xl bg-[var(--color-cream)] shadow-xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-3 bg-[var(--color-dark-teal)]">
          <div>
            <p className="text-[10px] font-sans font-bold uppercase tracking-[0.14em] text-[var(--color-orange)]">
              New
            </p>
            <h2
              id="whats-new-title"
              className="font-display text-lg font-bold text-[var(--color-warm-beige)]"
            >
              {announcement.title}
            </h2>
          </div>
          <button
            ref={closeRef}
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 w-9 h-9 -mr-1 flex items-center justify-center rounded text-[var(--color-warm-beige)]
              opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm font-sans text-gray-700 leading-relaxed">
            {announcement.body}
          </p>

          {announcement.graphic}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={dismiss}
              className="px-3 py-2 text-sm font-sans text-gray-600 rounded-md hover:bg-black/5
                focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)]"
            >
              Got it
            </button>
            {announcement.cta && (
              <Link
                href={announcement.cta.href}
                onClick={dismiss}
                className="px-4 py-2 text-sm font-sans font-semibold rounded-md text-white
                  bg-[var(--color-orange)] hover:opacity-90 focus:outline-none focus:ring-2
                  focus:ring-offset-1 focus:ring-[var(--color-orange)]"
              >
                {announcement.cta.label}
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
