"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_FIXED_COSTS,
  DEFAULT_INVESTMENTS,
} from "@csp/shared";
import type { CategoryMapping } from "@csp/shared";
import Link from "next/link";

/** Flat list of category options — no groups, no savings, no assets */
const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  ...DEFAULT_FIXED_COSTS.map((label) => ({
    value: `fixed_costs:${label}`,
    label,
  })),
  ...DEFAULT_INVESTMENTS.map((label) => ({
    value: `investments:${label}`,
    label,
  })),
  { value: "guilt_free:", label: "Guilt-Free Spending" },
];

function categoryLabel(spendingCategory: string, spendingSubcategory: string) {
  if (spendingSubcategory) return spendingSubcategory;
  if (spendingCategory === "guilt_free") return "Guilt-Free Spending";
  return spendingCategory;
}

export default function MappingsPage() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [formError, setFormError] = useState("");

  const { data: mappings, isLoading } = useQuery<CategoryMapping[]>({
    queryKey: ["category-mappings"],
    queryFn: () => api.get("/category-mappings"),
  });

  const addMutation = useMutation({
    mutationFn: (body: {
      descriptionNormalized: string;
      spendingCategory: string;
      spendingSubcategory: string;
    }) => api.post("/category-mappings", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-mappings"] });
      setKeyword("");
      setCategory("");
      setFormError("");
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/category-mappings/${id}`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["category-mappings"] }),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim()) {
      setFormError("Please enter a keyword.");
      return;
    }
    if (!category) {
      setFormError("Please select a category.");
      return;
    }
    const [spendingCategory, spendingSubcategory = ""] = category.split(":");
    addMutation.mutate({
      descriptionNormalized: keyword.trim().toLowerCase(),
      spendingCategory,
      spendingSubcategory,
    });
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 font-sans"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mt-1">
          Category Rules
        </h1>
        <p className="text-sm text-gray-500 font-sans mt-1">
          Define keywords that auto-categorize your transactions. When you click
          &ldquo;Auto-Categorize&rdquo; on the import page, descriptions are matched against
          these rules using fuzzy search.
        </p>
      </div>

      {/* Add Rule Form */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="font-sans font-semibold text-gray-800 mb-4">
          Add New Rule
        </h2>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-gray-600 mb-1 font-sans">
              Keyword (description pattern)
            </label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. netflix, whole foods, amazon"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans
                focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent"
            />
          </div>
          <div className="min-w-56">
            <label className="block text-xs font-medium text-gray-600 mb-1 font-sans">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-sans
                focus:outline-none focus:ring-2 focus:ring-[var(--color-orange)] focus:border-transparent"
            >
              <option value="">Select a category…</option>
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? "Saving…" : "Add Rule"}
          </Button>
        </form>
        {formError && (
          <p className="mt-2 text-sm text-red-500 font-sans">{formError}</p>
        )}
      </div>

      {/* Existing Rules Table */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-500 font-sans">
          Loading rules…
        </div>
      ) : mappings && mappings.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm font-sans">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Keyword
                </th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">
                  Maps To
                </th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">
                  Times Matched
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700">
                    {m.descriptionNormalized}
                  </td>
                  <td className="px-4 py-2.5 text-gray-800">
                    {categoryLabel(m.spendingCategory, m.spendingSubcategory)}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-500">
                    {m.timesUsed}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      disabled={deleteMutation.isPending}
                      className="text-xs text-red-400 hover:text-red-600 hover:underline font-sans"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500 font-sans text-sm">
            No rules yet. Add your first rule above, or categorize transactions
            on the import page — they&apos;ll be remembered automatically.
          </p>
        </div>
      )}
    </div>
  );
}
