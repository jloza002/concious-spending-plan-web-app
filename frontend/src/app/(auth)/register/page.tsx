"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/backend/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-[var(--color-dark-teal)] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
              Check your email
            </h1>
            <p className="mt-3 text-sm text-gray-600 font-sans">
              We sent a verification link to <strong>{email}</strong>.
              Click the link to activate your account.
            </p>
            <p className="mt-2 text-xs text-gray-400 font-sans">
              The link expires in 24 hours. Check your spam folder if you don&apos;t see it.
            </p>
          </div>
          <p className="text-sm text-gray-500 font-sans">
            Already verified?{" "}
            <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--color-dark-teal)]">
            Create Account
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-sans">
            Start planning your conscious spending
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1 font-sans"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1 font-sans"
            >
              Email
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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1 font-sans"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
            />
            <p className="mt-1 text-xs text-gray-400 font-sans">
              At least 8 characters
            </p>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 font-sans">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-[var(--color-orange)] hover:underline font-medium"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
