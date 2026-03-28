"use client";

import { usePlans, useCreatePlan, useDeletePlan } from "@/hooks/use-spending-plan";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${Math.round(n * 100)}%`;

export default function DashboardPage() {
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function handleCreate() {
    try {
      await createPlan.mutateAsync({ month: newMonth, year: newYear });
      setShowCreate(false);
    } catch {
      // error displayed via createPlan.error
    }
  }

  function openModal() {
    setNewMonth(new Date().getMonth() + 1);
    setNewYear(new Date().getFullYear());
    setShowCreate(true);
  }

  function confirmDelete() {
    if (deleteId) {
      deletePlan.mutate(deleteId);
      setDeleteId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 text-gray-500 font-sans">
        Loading your spending plans...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
          Your Spending Plans
        </h1>
        <Button onClick={openModal}>+ New Plan</Button>
      </div>

      {/* Create Plan Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          onTouchEnd={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <div className="bg-[var(--color-cream)] rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-[var(--color-dark-teal)] px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">
                New Spending Plan
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="w-10 h-10 flex items-center justify-center -mr-2 text-[var(--color-warm-beige)] opacity-70 hover:opacity-100 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                  Month
                </label>
                <select
                  value={newMonth}
                  onChange={(e) => setNewMonth(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-[var(--color-orange)]"
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={i + 1} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-sans">
                  Year
                </label>
                <input
                  type="number"
                  value={newYear}
                  onChange={(e) => setNewYear(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-sans text-sm focus:outline-none focus:border-[var(--color-orange)]"
                />
              </div>
              {createPlan.error && (
                <p className="text-sm text-red-500 font-sans">{createPlan.error.message}</p>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createPlan.isPending}>
                {createPlan.isPending ? "Creating..." : "Create Plan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
          onTouchEnd={(e) => { if (e.target === e.currentTarget) setDeleteId(null); }}
        >
          <div className="bg-[var(--color-cream)] rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-[var(--color-dark-teal)] px-6 py-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">
                Delete Plan
              </h2>
              <button
                onClick={() => setDeleteId(null)}
                className="w-10 h-10 flex items-center justify-center -mr-2 text-[var(--color-warm-beige)] opacity-70 hover:opacity-100 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-6">
              <p className="font-sans text-gray-700 text-sm">
                Are you sure you want to delete this spending plan?
              </p>
              <p className="font-sans text-gray-700 text-sm mt-2">
                This will permanently remove all transactions and data associated with it. This action cannot be undone.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button
                onClick={confirmDelete}
                disabled={deletePlan.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {deletePlan.isPending ? "Deleting..." : "Delete Plan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              <Link href={`/plan/${plan.id}`}>
                <h3 className="font-display text-lg font-bold text-[var(--color-dark-teal)]">
                  {MONTH_NAMES[plan.month - 1]} {plan.year}
                </h3>
                <div className="mt-3 space-y-1 font-sans text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net Worth</span>
                    <span className="font-medium">{fmt(plan.totalNetWorth ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net Income</span>
                    <span className="font-medium">{fmt(plan.netMonthlyIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fixed Costs</span>
                    <span className="font-medium">{pct(plan.fixedCostsPercentage ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Investments</span>
                    <span className="font-medium">{pct(plan.investmentsPercentage ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Savings</span>
                    <span className="font-medium">{pct(plan.savingsPercentage ?? 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guilt-Free</span>
                    <span className={`font-medium ${(plan.guiltFreeTotal ?? 0) < 0 ? "text-red-500" : "text-green-600"}`}>
                      {pct(plan.guiltFreePercentage ?? 0)}
                    </span>
                  </div>
                </div>
              </Link>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400 font-sans">
                  Updated {new Date(plan.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => setDeleteId(plan.id)}
                  className="text-xs text-gray-400 hover:text-red-500 font-sans transition-colors -my-2 -mx-1 py-2 px-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <h2 className="font-display text-xl font-bold text-[var(--color-dark-teal)] mb-2">
            No spending plans yet
          </h2>
          <p className="text-gray-500 font-sans mb-6">
            Create your first Conscious Spending Plan to get started.
          </p>
          <Button onClick={openModal} size="lg">
            Create Your First Plan
          </Button>
        </div>
      )}
    </div>
  );
}
