"use client";

import { use, useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import { usePlan } from "@/hooks/use-spending-plan";
import { useAddLineItem } from "@/hooks/use-line-items";
import {
  useTransactions,
  useImportTransactions,
  useAssignCategory,
  useAutoCategorize,
} from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import type { CsvTransaction, Transaction, SpendingPlan } from "@csp/shared";

// ─── Inline category selector ────────────────────────────────────────────────

interface CategorySelectProps {
  transaction: Transaction;
  categories: { value: string; label: string }[];
  onSelect: (transaction: Transaction, value: string) => void;
  onAdd: (transaction: Transaction, label: string) => Promise<void>;
}

function CategorySelect({ transaction, categories, onSelect, onAdd }: CategorySelectProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "__add__") {
      setIsAdding(true);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    onSelect(transaction, e.target.value);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    await onAdd(transaction, label);
    setNewLabel("");
    setIsAdding(false);
    setSaving(false);
  }

  if (isAdding) {
    return (
      <form onSubmit={handleAdd} className="flex items-center gap-1">
        <input
          ref={inputRef}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Category name…"
          className="flex-1 min-w-0 text-xs border border-[var(--color-orange)] rounded px-2 py-1 font-sans focus:outline-none"
        />
        <button
          type="submit"
          disabled={saving || !newLabel.trim()}
          className="text-xs font-medium text-[var(--color-orange)] hover:opacity-70 disabled:opacity-40 shrink-0"
        >
          {saving ? "…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => { setIsAdding(false); setNewLabel(""); }}
          className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
        >
          ✕
        </button>
      </form>
    );
  }

  const currentValue = transaction.spendingCategory
    ? `${transaction.spendingCategory}:${transaction.spendingSubcategory || ""}`
    : "";

  return (
    <select
      value={currentValue}
      onChange={handleChange}
      className="w-full text-xs border border-gray-200 rounded px-2 py-1 font-sans focus:outline-none focus:border-[var(--color-orange)]"
    >
      <option value="">Uncategorized</option>
      {categories.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      <option value="__add__">＋ Add category</option>
    </select>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);
  const { data: plan } = usePlan(planId);
  const { data: existingTransactions, isLoading } = useTransactions(planId);
  const importMutation = useImportTransactions(planId);
  const assignCategory = useAssignCategory();
  const autoCategorize = useAutoCategorize(planId);
  const addLineItem = useAddLineItem(planId);
  const [parsedRows, setParsedRows] = useState<CsvTransaction[]>([]);
  const [parseError, setParseError] = useState("");

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setParseError("");
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const transactions: CsvTransaction[] = results.data.map((row: any) => ({
              transactionDate: row["Transaction Date"] || "",
              postDate: row["Post Date"] || "",
              description: row["Description"] || "",
              category: row["Category"] || undefined,
              type: row["Type"] || "Sale",
              amount: parseFloat(row["Amount"]) || 0,
              memo: row["Memo"] || undefined,
            }));
            setParsedRows(transactions);
          } catch {
            setParseError("Failed to parse CSV. Please check the file format.");
          }
        },
        error: () => setParseError("Failed to read the file."),
      });
    },
    []
  );

  async function handleImport() {
    if (parsedRows.length === 0) return;
    await importMutation.mutateAsync(parsedRows);
    setParsedRows([]);
  }

  async function handleAutoCategorize() {
    if (!existingTransactions) return;
    const descriptions = existingTransactions
      .filter((t) => !t.spendingCategory)
      .map((t) => t.description);
    if (descriptions.length === 0) return;
    await autoCategorize.mutateAsync(descriptions);
  }

  // Flat list — fixed costs only
  const categoryOptions: { value: string; label: string }[] = plan
    ? plan.lineItems
        .filter((i) => i.section === "fixed_costs")
        .map((i) => ({ value: `fixed_costs:${i.label}`, label: i.label }))
    : [];

  function handleCategorySelect(transaction: Transaction, value: string) {
    const [category, subcategory] = value.split(":");
    assignCategory.mutate({
      transactionId: transaction.id,
      spendingCategory: category || null,
      spendingSubcategory: subcategory || null,
    });
  }

  async function handleAddCategory(transaction: Transaction, label: string) {
    // Add new fixed_costs line item to the plan
    const updatedPlan = await addLineItem.mutateAsync({
      section: "fixed_costs",
      label,
      amount: 0,
    }) as SpendingPlan;

    // Assign the new category to this transaction
    assignCategory.mutate({
      transactionId: transaction.id,
      spendingCategory: "fixed_costs",
      spendingSubcategory: label,
    });
  }

  return (
    <div>
      {/* Upload Zone */}
      {(!existingTransactions || existingTransactions.length === 0) && parsedRows.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center border-2 border-dashed border-gray-300">
          <h3 className="font-sans font-medium text-lg mb-2">Upload your CSV file</h3>
          <p className="text-sm text-gray-500 font-sans mb-4">
            Drop a Transactions.csv file or click to select
          </p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block mx-auto text-sm font-sans"
          />
          {parseError && (
            <p className="mt-3 text-sm text-red-500 font-sans">{parseError}</p>
          )}
        </div>
      )}

      {/* Parsed Preview */}
      {parsedRows.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans font-medium">{parsedRows.length} transactions found</h3>
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importMutation.isPending}>
                {importMutation.isPending ? "Importing..." : "Import All"}
              </Button>
              <Button variant="ghost" onClick={() => setParsedRows([])}>Cancel</Button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded">
            <table className="w-full text-sm font-sans">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5">{row.transactionDate}</td>
                    <td className="px-3 py-1.5 truncate max-w-xs">{row.description}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${row.type === "Return" ? "bg-green-100 text-green-700" : row.type === "Payment" ? "bg-gray-100 text-gray-500" : ""}`}>
                        {row.type}
                      </span>
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${row.amount > 0 ? "text-green-600" : ""}`}>
                      ${Math.abs(row.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 20 && (
              <p className="text-center text-xs text-gray-400 py-2">
                ...and {parsedRows.length - 20} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Imported Transactions */}
      {existingTransactions && existingTransactions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-sans font-medium">
              {existingTransactions.length} imported transactions
            </h3>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAutoCategorize}
                disabled={autoCategorize.isPending}
              >
                {autoCategorize.isPending ? "Auto-categorizing..." : "Auto-Categorize"}
              </Button>
              <label className="cursor-pointer inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-transparent hover:bg-black/5 transition-colors">
                Upload More
                <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm font-sans">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Date</th>
                  <th className="text-left px-3 py-2">Description</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-right px-3 py-2">Amount</th>
                  <th className="text-left px-3 py-2 w-56">Category</th>
                </tr>
              </thead>
              <tbody>
                {existingTransactions.map((t) => (
                  <tr key={t.id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 whitespace-nowrap">{t.transactionDate}</td>
                    <td className="px-3 py-1.5 truncate max-w-xs">{t.description}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${t.type === "Return" ? "bg-green-100 text-green-700" : t.type === "Payment" ? "bg-gray-100 text-gray-500" : ""}`}>
                        {t.type}
                      </span>
                    </td>
                    <td className={`px-3 py-1.5 text-right tabular-nums ${t.amount > 0 ? "text-green-600" : ""}`}>
                      ${Math.abs(t.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-1.5">
                      <CategorySelect
                        transaction={t}
                        categories={categoryOptions}
                        onSelect={handleCategorySelect}
                        onAdd={handleAddCategory}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
