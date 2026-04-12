"use client";

const RULES = [
  { test: (p: string) => p.length >= 8, label: "At least 8 characters" },
  { test: (p: string) => /[A-Z]/.test(p), label: "One uppercase letter" },
  { test: (p: string) => /[a-z]/.test(p), label: "One lowercase letter" },
  { test: (p: string) => /[0-9]/.test(p), label: "One number" },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: "One special character" },
];

export function PasswordCriteria({ password }: { password: string }) {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.label} className="flex items-center gap-1.5 text-xs font-sans">
            <span className={met ? "text-green-500" : "text-gray-300"}>
              {met ? "\u2713" : "\u2717"}
            </span>
            <span className={met ? "text-green-600" : "text-gray-400"}>
              {rule.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
