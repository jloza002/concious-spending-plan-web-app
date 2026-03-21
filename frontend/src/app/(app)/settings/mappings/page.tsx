"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { CategoryMapping } from "@csp/shared";
import Link from "next/link";

export default function MappingsPage() {
  const queryClient = useQueryClient();
  const { data: mappings, isLoading } = useQuery<CategoryMapping[]>({
    queryKey: ["category-mappings"],
    queryFn: () => api.get("/category-mappings"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/category-mappings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-mappings"] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-gray-500 hover:text-gray-700 font-sans"
          >
            &larr; Back to Dashboard
          </Link>
          <h1 className="font-display text-2xl font-bold text-[var(--color-dark-teal)] mt-1">
            Category Memory
          </h1>
          <p className="text-sm text-gray-500 font-sans mt-1">
            Saved description-to-category mappings for auto-population on CSV import.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-500 font-sans">
          Loading mappings...
        </div>
      ) : mappings && mappings.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm font-sans">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3">Description Pattern</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Subcategory</th>
                <th className="text-center px-4 py-3">Times Used</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-mono text-xs">
                    {m.descriptionNormalized}
                  </td>
                  <td className="px-4 py-2">{m.spendingCategory}</td>
                  <td className="px-4 py-2">{m.spendingSubcategory}</td>
                  <td className="px-4 py-2 text-center">{m.timesUsed}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => deleteMutation.mutate(m.id)}
                      className="text-xs text-red-500 hover:underline"
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
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <p className="text-gray-500 font-sans">
            No saved mappings yet. Import a CSV and categorize transactions to
            build your memory.
          </p>
        </div>
      )}
    </div>
  );
}
