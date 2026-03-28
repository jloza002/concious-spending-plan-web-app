"use client";

import { signIn } from "next-auth/react";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setIsLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-md p-5 sm:p-8 bg-white rounded-2xl shadow-lg">
      <div className="text-center mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-dark-teal)]">
          Conscious Spending Plan
        </h1>
        <p className="mt-2 text-sm text-gray-500 font-sans">
          Sign in to manage your spending plan
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {justRegistered && (
          <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg font-sans">
            Account created! Sign in to get started.
          </div>
        )}
        {error && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg font-sans">
            {error}
          </div>
        )}

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
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="flex justify-end">
          <a href="/forgot-password" className="text-xs text-[var(--color-orange)] hover:underline font-sans">
            Forgot password?
          </a>
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 font-sans">
        Don&apos;t have an account?{" "}
        <a
          href="/register"
          className="text-[var(--color-orange)] hover:underline font-medium"
        >
          Create one
        </a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-cream)] px-4">
      <Suspense fallback={<div className="w-full max-w-md p-5 sm:p-8 bg-white rounded-2xl shadow-lg animate-pulse h-96" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
