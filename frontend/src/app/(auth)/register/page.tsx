"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your elementary school?",
  "What was the make of your first car?",
  "What is the name of the street you grew up on?",
];

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [middleInitial, setMiddleInitial] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await fetch("/api/backend/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, middleInitial: middleInitial || undefined, lastName, email, password, securityQuestion, securityAnswer }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        setIsLoading(false);
        return;
      }

      router.push("/login?registered=1");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-start sm:items-center justify-center bg-[var(--color-cream)] px-4 py-8">
      <div className="w-full max-w-md p-5 sm:p-8 bg-white rounded-2xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[var(--color-dark-teal)]">
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

          {/* Name row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>
            <div className="w-20">
              <label htmlFor="middleInitial" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                M.I.
              </label>
              <input
                id="middleInitial"
                type="text"
                value={middleInitial}
                onChange={(e) => setMiddleInitial(e.target.value.slice(0, 1).toUpperCase())}
                maxLength={1}
                placeholder="A"
                autoComplete="additional-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans text-center"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                  focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
              Password
            </label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-gray-400 font-sans">
              Min 8 chars, uppercase, lowercase, number, and special character
            </p>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 font-sans mb-3">
              Set a security question to recover your account if you forget your password.
            </p>
            <div className="space-y-3">
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
                <label htmlFor="security-answer" className="block text-sm font-medium text-gray-700 mb-1 font-sans">
                  Your Answer
                </label>
                <input
                  id="security-answer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  placeholder="Your answer (case-insensitive)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none
                    focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent font-sans"
                />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 font-sans">
          Already have an account?{" "}
          <a href="/login" className="text-[var(--color-orange)] hover:underline font-medium">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
