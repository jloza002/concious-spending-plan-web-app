import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex flex-col items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="font-display text-5xl font-bold text-[var(--color-dark-teal)] mb-4">
          Conscious Spending Plan
        </h1>
        <p className="text-lg text-gray-600 font-sans mb-8">
          Take control of your money with the IWT method. Plan your fixed costs,
          investments, savings, and guilt-free spending — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/register"
            className="inline-flex items-center px-6 py-3 bg-[var(--color-orange)] text-white
              font-medium rounded-lg hover:opacity-90 transition-opacity font-sans"
          >
            Get Started Free
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center px-6 py-3 bg-[var(--color-dark-teal)] text-white
              font-medium rounded-lg hover:opacity-90 transition-opacity font-sans"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="mt-16 max-w-3xl w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { pct: "50-60%", label: "Fixed Costs", desc: "Rent, utilities, groceries" },
            { pct: "10%", label: "Investments", desc: "Retirement, stocks" },
            { pct: "5-10%", label: "Savings", desc: "Vacation, emergency fund" },
            { pct: "20-35%", label: "Guilt-Free", desc: "Dining, entertainment" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white rounded-lg p-4 shadow-sm text-center"
            >
              <div className="font-display text-2xl font-bold text-[var(--color-orange)]">
                {item.pct}
              </div>
              <div className="font-sans font-medium text-[var(--color-dark-teal)] mt-1">
                {item.label}
              </div>
              <div className="text-xs text-gray-500 font-sans mt-1">
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
