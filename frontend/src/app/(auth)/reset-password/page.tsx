"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing or invalid reset token. Please request a new password reset link.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
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
    const failing = passwordRules.filter((r) => !r.test(password));
    if (failing.length > 0) {
      setError(`Password must contain: ${failing.map((r) => r.msg).join(", ")}.`);
      return;
    }

    setIsLoading(true);
    const res = await fetch("/api/backend/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "Failed to reset password. The link may have expired.");
    }

    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-dark-teal)]">
            Set New Password
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            Choose a strong password for your account.
          </p>
        </div>

        {success ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-green-700 font-sans font-medium">
              Password reset successfully! Redirecting you to sign in...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">{error}</div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
              <p className="mt-1 text-xs text-gray-400 font-sans">
                Min 8 chars, uppercase, lowercase, number, and special character.
              </p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading || !token}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <p className="text-center text-sm text-gray-500 font-sans">
              <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
                Back to sign in
              </a>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
