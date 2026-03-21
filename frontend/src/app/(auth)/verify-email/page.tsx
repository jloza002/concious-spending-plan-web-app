"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type Status = "loading" | "success" | "error" | "resending" | "resent";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>(token ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [showResend, setShowResend] = useState(false);

  useEffect(() => {
    if (!token) {
      setErrorMessage("No verification token provided.");
      return;
    }

    fetch(`/api/backend/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
        } else {
          setErrorMessage(data.message || "Verification failed.");
          setStatus("error");
          // Show resend option for expired tokens
          if (data.message?.toLowerCase().includes("expired")) {
            setShowResend(true);
          }
        }
      })
      .catch(() => {
        setErrorMessage("An unexpected error occurred.");
        setStatus("error");
      });
  }, [token]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    setStatus("resending");

    try {
      const res = await fetch("/api/backend/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resendEmail }),
      });

      if (res.ok) {
        setStatus("resent");
      } else {
        const data = await res.json();
        setErrorMessage(data.message || "Failed to resend. Please try again.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("An unexpected error occurred.");
      setStatus("error");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
        {status === "loading" && (
          <>
            <div className="w-16 h-16 border-4 border-[var(--color-dark-teal)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
              Verifying your email...
            </h1>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
              Email verified!
            </h1>
            <p className="mt-3 text-sm text-gray-600 font-sans">
              Your account is now active. You can sign in to start planning.
            </p>
            <div className="mt-6">
              <Button asChild className="w-full" size="lg">
                <a href="/login">Sign in to your account</a>
              </Button>
            </div>
          </>
        )}

        {(status === "error" || status === "resending") && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
              Verification failed
            </h1>
            <p className="mt-3 text-sm text-gray-600 font-sans">{errorMessage}</p>

            {showResend && (
              <form onSubmit={handleResend} className="mt-6 text-left">
                <label htmlFor="resend-email" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                  Enter your email to get a new link
                </label>
                <input
                  id="resend-email"
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                    focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans mb-3"
                />
                <Button type="submit" className="w-full" disabled={status === "resending"}>
                  {status === "resending" ? "Sending..." : "Resend verification email"}
                </Button>
              </form>
            )}

            <p className="mt-4 text-sm text-gray-500 font-sans">
              <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
                Back to sign in
              </a>
            </p>
          </>
        )}

        {status === "resent" && (
          <>
            <div className="w-16 h-16 bg-[var(--color-dark-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
              New link sent!
            </h1>
            <p className="mt-3 text-sm text-gray-600 font-sans">
              Check your inbox for a new verification link. It expires in 24 hours.
            </p>
            <p className="mt-4 text-sm text-gray-500 font-sans">
              <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
                Back to sign in
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
