"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSeenTours, useMarkTourSeen } from "@/hooks/use-seen-tours";

export interface TourStep {
  /** CSS selector for the element to highlight. Omit for a centered, anchorless step. */
  selector?: string;
  title: string;
  body: string;
}

interface GuidedTourProps {
  /** Stable id used for the localStorage "seen" flag. */
  tourId: string;
  steps: TourStep[];
  /** Bump to re-show the tour after meaningful changes. */
  version?: number;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

/**
 * Lightweight, dependency-free first-run product tour. On a user's first visit
 * to a page it highlights key elements with a stepped tooltip. The "seen" flag
 * is stored per page in localStorage so it never nags. Listens for a
 * `csp:start-tour` window event (with `detail === tourId`) so a Help button can
 * replay it.
 */
export function GuidedTour({ tourId, steps, version = 1 }: GuidedTourProps) {
  // Seen-state is account-scoped (server-side) so tours don't re-run on every
  // new browser/device. Versioning the id lets us re-show after big changes.
  const seenId = `${tourId}:v${version}`;
  const { data: seenTours, isLoading } = useSeenTours();
  const markSeen = useMarkTourSeen();
  const hasSeen = !!seenTours?.includes(seenId);

  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const autoStartedRef = useRef(false);

  // Manual replay via custom event (e.g. a Help button) — always available.
  useEffect(() => {
    const onStart = (e: Event) => {
      if ((e as CustomEvent).detail === tourId) {
        setStepIndex(0);
        setActive(true);
      }
    };
    window.addEventListener("csp:start-tour", onStart);
    return () => window.removeEventListener("csp:start-tour", onStart);
  }, [tourId]);

  // Auto-start once, only when we know (from the account) it hasn't been seen.
  useEffect(() => {
    if (isLoading || hasSeen || autoStartedRef.current) return;
    autoStartedRef.current = true;
    const t = setTimeout(() => setActive(true), 600);
    return () => clearTimeout(t);
  }, [isLoading, hasSeen]);

  const finish = useCallback(() => {
    setActive(false);
    if (!hasSeen) markSeen.mutate(seenId);
  }, [hasSeen, markSeen, seenId]);

  const measure = useCallback(() => {
    const step = steps[stepIndex];
    if (!step?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setRect(null);
      return;
    }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [steps, stepIndex]);

  useLayoutEffect(() => {
    if (!active) return;
    measure();
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [active, measure]);

  if (!active || steps.length === 0) return null;

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Position the tooltip: below the target if there's room, else above; clamp horizontally.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const CARD_W = Math.min(340, vw - 24);

  let cardTop: number;
  let cardLeft: number;
  if (rect) {
    const below = rect.top + rect.height + PAD + 12;
    const wantBelow = below + 160 < vh;
    cardTop = wantBelow ? rect.top + rect.height + PAD + 8 : Math.max(12, rect.top - PAD - 8 - 160);
    cardLeft = Math.min(Math.max(12, rect.left), vw - CARD_W - 12);
  } else {
    cardTop = vh / 2 - 90;
    cardLeft = vw / 2 - CARD_W / 2;
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-live="polite" role="dialog" aria-label="Guided tour">
      {/* Dimmer + spotlight */}
      {rect ? (
        <div
          className="absolute rounded-lg pointer-events-none transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(15, 28, 27, 0.6)",
            outline: "2px solid var(--color-orange)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(15,28,27,0.6)]" />
      )}

      {/* Tooltip card */}
      <div
        ref={cardRef}
        className="absolute bg-white rounded-xl shadow-2xl ring-1 ring-black/10 p-4 font-sans"
        style={{ top: cardTop, left: cardLeft, width: CARD_W }}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-display font-bold text-[var(--color-dark-teal)] text-base">{step.title}</h3>
          <button
            onClick={finish}
            className="text-gray-400 hover:text-gray-600 text-sm shrink-0"
            aria-label="Skip tour"
          >
            Skip
          </button>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">{step.body}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="text-sm text-gray-500 hover:text-gray-800 px-2 py-1"
              >
                Back
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
              className="text-sm font-medium bg-[var(--color-dark-teal)] text-[var(--color-warm-beige)] px-3 py-1.5 rounded-lg hover:bg-[#15302F]/90"
            >
              {isLast ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
