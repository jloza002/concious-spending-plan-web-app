"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSession, signOut, useSession } from "next-auth/react";

// Idle window before the session ends, and how long before that to warn.
const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour of no activity
const WARN_BEFORE_MS = 2 * 60 * 1000; // show the warning 2 minutes prior

/**
 * Watches for inactivity and expired sessions. After IDLE_LIMIT_MS with no user
 * activity it signs the user out and returns them to the login page. Two minutes
 * before that it shows a countdown modal with a "Stay signed in" action. Also
 * reacts to a failed token refresh (session.error) by signing out immediately.
 */
export function SessionGuard() {
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated";

  const lastActivityRef = useRef(Date.now());
  const warningRef = useRef(false);
  const [warning, setWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(WARN_BEFORE_MS);

  const logout = useCallback(() => {
    signOut({ callbackUrl: "/login?expired=1" });
  }, []);

  // Track activity. While the warning modal is up we ignore ambient activity so
  // the user must explicitly choose "Stay signed in" (or be logged out).
  useEffect(() => {
    if (!authenticated) return;
    let throttled = false;
    const onActivity = () => {
      if (warningRef.current || throttled) return;
      throttled = true;
      setTimeout(() => (throttled = false), 2000);
      lastActivityRef.current = Date.now();
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, onActivity));
  }, [authenticated]);

  // Tick: decide whether to warn or log out.
  useEffect(() => {
    if (!authenticated) return;
    const id = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current;
      if (idle >= IDLE_LIMIT_MS) {
        logout();
      } else if (idle >= IDLE_LIMIT_MS - WARN_BEFORE_MS) {
        warningRef.current = true;
        setWarning(true);
        setRemainingMs(IDLE_LIMIT_MS - idle);
      } else if (warningRef.current) {
        warningRef.current = false;
        setWarning(false);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [authenticated, logout]);

  // A failed refresh means the session can't continue — sign out cleanly.
  useEffect(() => {
    if (authenticated && (session as { error?: string } | null)?.error === "RefreshAccessTokenError") {
      logout();
    }
  }, [authenticated, session, logout]);

  const staySignedIn = useCallback(async () => {
    lastActivityRef.current = Date.now();
    warningRef.current = false;
    setWarning(false);
    // Nudge NextAuth to refresh the access token if it's near expiry.
    await getSession();
  }, []);

  if (!warning) return null;

  const secs = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 font-sans">
        <h2 className="font-display text-lg font-bold text-[var(--color-dark-teal)] mb-1">Still there?</h2>
        <p className="text-sm text-gray-600 mb-4">
          You&apos;ve been inactive for a while. For your security we&apos;ll sign you out in{" "}
          <span className="font-semibold tabular-nums text-[var(--color-orange)]">{mm}:{ss}</span>.
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-800 px-3 py-2"
          >
            Log out now
          </button>
          <button
            onClick={staySignedIn}
            className="text-sm font-medium bg-[var(--color-dark-teal)] text-[var(--color-warm-beige)] px-4 py-2 rounded-lg hover:bg-[#15302F]/90"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
