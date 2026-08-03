"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordCriteria } from "@/components/ui/password-criteria";
import { SECURITY_QUESTIONS } from "@/lib/security-questions";

type Step = "form" | "success";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
        body: JSON.stringify({ email, securityQuestion, securityAnswer, newPassword }),
      });

      if (res.ok) {
        setStep("success");
        setTimeout(() => router.push("/login"), 2500);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(
          data.message ||
            "We couldn't verify those details. Double-check your email, security question, and answer, then try again."
        );
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Could not reach the server. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start sm:items-center justify-center bg-[var(--color-cream)] px-4 py-8">
      <div className="w-full max-w-md p-5 sm:p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-dark-teal)]">
            Reset Password
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            {step === "form" &&
              "Enter your email, the security question you set at sign-up, and your answer."}
            {step === "success" && "Your password has been reset."}
          </p>
        </div>

        {step === "form" && (
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div>
              <label htmlFor="security-question" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Security Question
              </label>
              <select
                id="security-question"
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-sm"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
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
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
              <PasswordCriteria password={newPassword} />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Confirm Password
              </label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>
            <p className="text-center text-sm text-gray-500 font-sans">
              <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
                Back to sign in
              </a>
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
