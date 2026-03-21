"use client";

import { usePlans, useCreatePlan, useDeletePlan } from "@/hooks/use-spending-plan";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function DashboardPage() {
  const { data: plans, isLoading } = usePlans();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();
  const [showCreate, setShowCreate] = useState(false);
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);
  const [newYear, setNewYear] = useState(new Date().getFullYear());

  async function handleCreate() {
    await createPlan.mutateAsync({ month: newMonth, year: newYear });
    setShowCreate(false);
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
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)]">
          Your Spending Plans
        </h1>
        <Button onClick={() => setShowCreate(true)}>+ New Plan</Button>
      </div>

      {/* Create Plan Dialog */}
      {showCreate && (
        <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
          <h3 className="font-sans font-medium mb-3">Create New Plan</h3>
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-sans">
                Month
              </label>
              <select
                value={newMonth}
                onChange={(e) => setNewMonth(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg font-sans"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={i + 1} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1 font-sans">
                Year
              </label>
              <input
                type="number"
                value={newYear}
                onChange={(e) => setNewYear(Number(e.target.value))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg font-sans"
              />
            </div>
            <Button onClick={handleCreate} disabled={createPlan.isPending}>
              {createPlan.isPending ? "Creating..." : "Create"}
            </Button>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
          </div>
          {createPlan.error && (
            <p className="mt-2 text-sm text-red-500 font-sans">
              {createPlan.error.message}
            </p>
          )}
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
                    <span className="text-gray-500">Net Income</span>
                    <span className="font-medium">
                      ${plan.netMonthlyIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fixed Costs</span>
                    <span className="font-medium">
                      {Math.round(plan.fixedCostsPercentage * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Guilt-Free</span>
                    <span
                      className={`font-medium ${plan.guiltFreeTotal < 0 ? "text-red-500" : "text-green-600"}`}
                    >
                      ${plan.guiltFreeTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </Link>
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400 font-sans">
                  Updated {new Date(plan.updatedAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => {
                    if (confirm("Delete this plan?")) {
                      deletePlan.mutate(plan.id);
                    }
                  }}
                  className="text-xs text-gray-400 hover:text-red-500 font-sans"
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
          <Button onClick={() => setShowCreate(true)} size="lg">
            Create Your First Plan
          </Button>
        </div>
      )}
    </div>
  );
}
