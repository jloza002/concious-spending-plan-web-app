"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Step = "email" | "answer" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/backend/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.question) {
        setError("No account found with that email, or no security question set.");
        setIsLoading(false);
        return;
      }

      setSecurityQuestion(data.question);
      setStep("answer");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const passwordRules = [
      { test: (p: string) => p.length >= 8, msg: "at least 8 characters" },
      { test: (p: string) => /[A-Z]/.test(p), msg: "an uppercase letter" },
      { test: (p: string) => /[a-z]/.test(p), msg: "a lowercase letter" },
      { test: (p: string) => /[0-9]/.test(p), msg: "a number" },
      { test: (p: string) => /[^A-Za-z0-9]/.test(p), msg: "a special character" },
    ];
    const failing = passwordRules.filter((r) => !r.test(newPassword));
    if (failing.length > 0) {
      setError(`Password must contain: ${failing.map((r) => r.msg).join(", ")}.`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/backend/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, securityAnswer, newPassword }),
      });

      if (res.ok) {
        setStep("success");
        setTimeout(() => router.push("/login"), 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Incorrect answer. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-dark-teal)]">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            {step === "email" && "Enter your email to get started."}
            {step === "answer" && "Answer your security question to reset your password."}
            {step === "success" && "Your password has been reset."}
          </p>
        </div>

        {step === "email" && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Looking up..." : "Continue"}
            </Button>
            <p className="text-center text-sm text-gray-500 font-sans">
              <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
                Back to sign in
              </a>
            </p>
          </form>
        )}

        {step === "answer" && (
          <form onSubmit={handleResetSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{error}</div>
            )}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 font-sans mb-1">Security question for {email}:</p>
              <p className="text-sm font-medium text-gray-800 font-sans">{securityQuestion}</p>
            </div>
            <div>
              <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Your Answer
              </label>
              <input
                id="answer"
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                placeholder="Case-insensitive"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
              <p className="mt-1 text-xs text-gray-400 font-sans">
                Min 8 chars, uppercase, lowercase, number, and special character
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
            <p className="text-center text-sm text-gray-500 font-sans">
              <button
                type="button"
                onClick={() => { setStep("email"); setError(""); }}
                className="text-[var(--color-orange)] hover:underline font-medium"
              >
                Use a different email
              </button>
            </p>
          </form>
        )}

        {step === "success" && (
          <div className="text-center space-y-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 font-sans">
              Password reset successfully! Redirecting you to sign in...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
