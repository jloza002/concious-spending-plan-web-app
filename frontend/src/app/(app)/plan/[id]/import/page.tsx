"use client";

import { use, useState, useMemo, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Papa from "papaparse";
import { usePlan, useManageTransactionType } from "@/hooks/use-spending-plan";
import { useAddLineItem, useDeleteLineItem, useRenameCategory } from "@/hooks/use-line-items";
import {
  useTransactions,
  useDeletedTransactions,
  useImportTransactions,
  useAssignCategory,
  useAutoCategorize,
  useDeleteTransaction,
  useRestoreTransaction,
  useAddTransaction,
  useUpdateTransactionType,
  useUpdateTransactionAccountType,
  useDeleteAllTransactions,
} from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
import { GuidedTour } from "@/components/tour/guided-tour";
import { TRANSACTIONS_TOUR } from "@/components/tour/tours";
import type { CsvTransaction, Transaction } from "@csp/shared";

const SECTION_LABELS: Record<string, string> = {
  fixed_costs: "Fixed Costs",
  investments: "Investments",
  savings: "Savings Goals",
};

// ─── Category Dropdown ────────────────────────────────────────────────────────

interface CategoryOption {
  value: string;
  label: string;
  itemId: string;
  section: string;
}

interface CategorySelectProps {
  transaction: Transaction;
  categories: CategoryOption[];
  onSelect: (transaction: Transaction, value: string) => void;
  onAdd: (transaction: Transaction, label: string) => Promise<void>;
  onDelete: (itemId: string) => Promise<void>;
  onRename: (itemId: string, oldLabel: string, newLabel: string) => Promise<void>;
  locked?: boolean;
}

function CategorySelect({ transaction, categories, onSelect, onAdd, onDelete, onRename, locked = false }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditMode(false);
        setRenamingId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropUp(window.innerHeight - rect.bottom < 280);
    }
    if (open) { setEditMode(false); setRenamingId(null); }
    setOpen((v) => !v);
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

  async function handleDelete(itemId: string) {
    setDeletingId(itemId);
    await onDelete(itemId);
    setDeletingId(null);
  }

  // A transaction tagged to a subcategory that no longer exists in this plan is
  // treated as uncategorized — no orphan styling, it just reads "Uncategorized".
  const isOrphaned =
    !!transaction.spendingSubcategory &&
    !categories.some((c) => c.label === transaction.spendingSubcategory);
  const currentLabel = isOrphaned
    ? ""
    : transaction.spendingSubcategory ||
      (transaction.spendingCategory ? SECTION_LABELS[transaction.spendingCategory] ?? transaction.spendingCategory : "");
  const isCategorized = !!transaction.spendingCategory && !isOrphaned;

  if (isAdding) {
    return (
      <form onSubmit={handleAdd} className="flex items-center gap-1">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Category name…"
          className="flex-1 min-w-0 text-xs border border-[var(--color-orange)] rounded px-2 py-1 font-sans focus:outline-none bg-white"
          autoFocus
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

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`w-full text-xs text-left rounded px-2 py-1.5 font-sans focus:outline-none flex items-center justify-between gap-1 transition-colors ${
          isCategorized
            ? "bg-[#15302F]/10 text-[#15302F] border border-[#15302F]/20 font-medium"
            : "border border-gray-200 text-gray-400 bg-white hover:border-gray-300"
        }`}
      >
        <span className="truncate">{currentLabel || "Uncategorized"}</span>
        <span className="text-[10px] opacity-50 shrink-0">▾</span>
      </button>

      {open && (
        <div className={`absolute z-50 left-0 w-72 bg-white border border-gray-300 rounded-lg shadow-2xl ring-1 ring-black/5 overflow-hidden ${dropUp ? "bottom-full mb-1" : "mt-1"}`}>
          {/* Scrollable category list */}
          <div className="max-h-56 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            <button
              type="button"
              onClick={() => { onSelect(transaction, ""); setOpen(false); }}
              className="w-full text-left text-xs px-3 py-1.5 hover:bg-[#F5EEE4] font-sans text-gray-400"
            >
              Uncategorized
            </button>

            {categories.length > 0 && categories.map((opt) => (
              <div key={opt.value} className="flex items-center hover:bg-[#F5EEE4]">
                {editMode && renamingId === opt.itemId ? (
                  <form
                    className="flex items-center gap-1 flex-1 px-2 py-1"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const trimmed = renameValue.trim();
                      if (trimmed && trimmed !== opt.label) {
                        setSaving(true);
                        await onRename(opt.itemId, opt.label, trimmed);
                        setSaving(false);
                      }
                      setRenamingId(null);
                    }}
                  >
                    <input
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Escape") setRenamingId(null); }}
                      className="flex-1 min-w-0 text-xs border border-[var(--color-orange)] rounded px-1.5 py-0.5 font-sans focus:outline-none bg-white"
                      autoFocus
                      disabled={saving}
                    />
                    <button type="submit" disabled={saving || !renameValue.trim()} className="text-xs text-[var(--color-orange)] hover:opacity-70 disabled:opacity-40 shrink-0 font-medium">
                      {saving ? "…" : "Save"}
                    </button>
                    <button type="button" onClick={() => setRenamingId(null)} className="text-xs text-gray-400 hover:text-gray-600 shrink-0">✕</button>
                  </form>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (editMode) { setRenamingId(opt.itemId); setRenameValue(opt.label); }
                        else { onSelect(transaction, opt.value); setOpen(false); }
                      }}
                      className="flex-1 text-left text-xs px-3 py-1.5 font-sans truncate"
                    >
                      {opt.label}
                    </button>
                    {editMode && (
                      <>
                        <button
                          type="button"
                          onClick={() => { setRenamingId(opt.itemId); setRenameValue(opt.label); }}
                          className="shrink-0 px-1.5 py-1.5 text-gray-300 hover:text-[var(--color-orange)]"
                          title="Rename"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDelete(opt.itemId); }}
                          disabled={deletingId === opt.itemId}
                          className="shrink-0 px-1.5 py-1.5 text-[10px] text-gray-300 hover:text-red-400 disabled:opacity-40"
                          title="Delete"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Fixed footer — always visible regardless of scroll */}
          {locked ? (
            <div className="border-t border-gray-100 px-3 py-2 text-[10px] text-amber-700 bg-amber-50 font-sans">
              🔒 Locked plan — unlock from the plan page to edit categories.
            </div>
          ) : (
          <div className="border-t border-gray-100">
            {editMode ? (
              <div className="flex">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setIsAdding(true); }}
                  className="flex-1 text-left text-xs px-3 py-2 hover:bg-[#F5EEE4] font-sans text-[var(--color-orange)]"
                >
                  ＋ Add
                </button>
                <button
                  type="button"
                  onClick={() => { setEditMode(false); setRenamingId(null); }}
                  className="text-xs px-3 py-2 hover:bg-[#F5EEE4] font-sans text-gray-500 border-l border-gray-100"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="w-full text-left text-xs px-3 py-2 hover:bg-[#F5EEE4] font-sans text-gray-500 flex items-center gap-1.5"
              >
                <span>✎</span> Edit categories
              </button>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: CsvTransaction[], skippedDuplicates: number) => Promise<void>;
  isImporting: boolean;
  existingTransactions: Transaction[];
}

function ImportModal({ onClose, onImport, isImporting, existingTransactions }: ImportModalProps) {
  const [parsedRows, setParsedRows] = useState<CsvTransaction[]>([]);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  // For each parsed row at index i, has the user opted to import it even if flagged as a duplicate?
  const [keepDuplicate, setKeepDuplicate] = useState<Record<number, boolean>>({});

  // Flag each parsed row as duplicate based on existing transactions in the plan
  const rowIsDuplicate = useMemo(() => {
    const existingKeys = new Set(
      existingTransactions.map(
        (t) => `${t.transactionDate}|${t.description}|${Number(t.amount).toFixed(2)}`
      )
    );
    return parsedRows.map(
      (r) => existingKeys.has(`${r.transactionDate}|${r.description}|${r.amount.toFixed(2)}`)
    );
  }, [parsedRows, existingTransactions]);

  const duplicateIndexes = rowIsDuplicate.flatMap((isDup, i) => (isDup ? [i] : []));
  const duplicateCount = duplicateIndexes.length;
  const keepCount = duplicateIndexes.filter((i) => keepDuplicate[i]).length;
  const skipCount = duplicateCount - keepCount;
  const rowsToImport = parsedRows.filter((_, i) => !rowIsDuplicate[i] || keepDuplicate[i]);

  function normalizeAccountType(raw: string): "credit_card" | "checking" | "savings" | undefined {
    if (!raw) return undefined;
    const v = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (v.includes("credit") || v.includes("card") || v.includes("cc")) return "credit_card";
    if (v.includes("checking")) return "checking";
    if (v.includes("saving")) return "savings";
    return undefined;
  }

  function normalizeType(raw: string): "Sale" | "Return" | "Payment" | "Adjustment" | "Debit" | "Credit" {
    const VALID = ["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"] as const;
    if ((VALID as readonly string[]).includes(raw)) return raw as typeof VALID[number];
    const u = raw.toUpperCase();
    if (u.includes("PMT") || u.includes("PAYMENT")) return "Payment";
    if (u.includes("XFER") || u.includes("TRANSFER") || u.includes("PARTNERFI") || u.includes("ACCT_")) return "Adjustment";
    if (u.includes("DEBIT") || u.includes("QUICKPAY_DEBIT") || u.includes("MISC_DEBIT")) return "Debit";
    if (u.includes("CREDIT") || u.includes("QUICKPAY_CREDIT")) return "Credit";
    if (u.includes("RETURN") || u.includes("REFUND")) return "Return";
    return "Sale";
  }

  function pick(row: Record<string, string>, ...keys: string[]): string {
    for (const k of keys) if (row[k]) return row[k];
    return "";
  }

  const MAX_FILE_SIZE_MB = 5;
  const MAX_ROWS = 10_000;

  function normalizeDate(s: string): string {
    if (!s) return "";
    // Already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
    // MM/DD/YYYY or M/D/YYYY
    const parts = s.split("/");
    if (parts.length === 3) {
      const m = parseInt(parts[0], 10);
      const d = parseInt(parts[1], 10);
      let y = parseInt(parts[2], 10);
      if (parts[2].length === 2) y += 2000;
      if (isNaN(m) || isNaN(d) || isNaN(y) || m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return "";
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    return "";
  }

  function isValidDate(s: string): boolean {
    const n = normalizeDate(s);
    if (!n) return false;
    const dt = new Date(n);
    return !isNaN(dt.getTime()) && dt.getFullYear() >= 1900 && dt.getFullYear() <= 2100;
  }

  function parseFile(file: File) {
    setParseError("");
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setParseError(`File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const rows = (results.data as Record<string, string>[]).slice(0, MAX_ROWS);
          const transactions: CsvTransaction[] = rows
            .map((row) => {
              const rawDate = pick(row, "Transaction Date", "Date", "Posting Date", "Trans Date", "TransDate");
              const rawPostDate = pick(row, "Post Date", "Posting Date", "Date", "Transaction Date");
              const transactionDate = normalizeDate(rawDate);
              const postDate = isValidDate(rawPostDate) ? normalizeDate(rawPostDate) : transactionDate;
              const description = pick(row, "Description", "Details", "Merchant", "Payee", "Name");
              if (!isValidDate(transactionDate) || !description) return null;
              return {
                transactionDate,
                postDate,
                description,
                category: pick(row, "Category") || undefined,
                type: normalizeType(pick(row, "Type", "Transaction Type", "Details")),
                amount: parseFloat(pick(row, "Amount", "Debit", "Credit") ?? "0") || 0,
                memo: pick(row, "Memo", "Note", "Notes") || undefined,
                accountType: normalizeAccountType(pick(row, "Account Type", "AccountType", "Account")),
              } as CsvTransaction;
            })
            .filter((t): t is CsvTransaction => t !== null);
          if (transactions.length === 0) {
            setParseError("No valid transactions found. Check that your CSV has Date and Description columns.");
          } else {
            setParsedRows(transactions);
          }
        } catch {
          setParseError("Failed to parse CSV. Please check the file format.");
        }
      },
      error: () => setParseError("Failed to read the file."),
    });
  }

  function isValidCsvFile(file: File): boolean {
    // Only check extension — MIME types for CSV are wildly inconsistent across
    // browsers and operating systems (e.g. Windows may report application/octet-stream).
    return file.name.toLowerCase().endsWith(".csv");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isValidCsvFile(file)) {
      setParseError("Invalid file type. Please upload a .csv file.");
      return;
    }
    parseFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!isValidCsvFile(file)) {
      setParseError("Invalid file type. Please upload a .csv file.");
      return;
    }
    parseFile(file);
  }

  async function handleImport() {
    if (rowsToImport.length === 0) return;
    try {
      await onImport(rowsToImport, skipCount);
      onClose();
    } catch {
      // parent has already shown the error in the summary banner
    }
  }

  function handleDownloadTemplate() {
    const headers = [
      "Transaction Date",
      "Post Date",
      "Description",
      "Category",
      "Type",
      "Amount",
      "Memo",
      "Account Type",
    ];
    const sample = [
      ["2026-01-15", "2026-01-16", "Whole Foods Market", "Groceries", "Sale", "-87.42", "", "Credit Card"],
      ["2026-01-15", "2026-01-15", "Salary Deposit", "Income", "Credit", "3500.00", "Monthly payroll", "Checking Account"],
    ];
    const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const csv =
      headers.map(escape).join(",") +
      "\n" +
      sample.map((row) => row.map(escape).join(",")).join("\n") +
      "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "csp-transactions-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-cream)] rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#15302F] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">
            Import Transactions
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--color-warm-beige)] opacity-60 hover:opacity-100 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-5">
          {parsedRows.length === 0 ? (
            /* Drop Zone */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                isDragging
                  ? "border-[var(--color-orange)] bg-[var(--color-orange)]/5"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="font-sans font-medium text-gray-700 mb-1">Drop your CSV file here</p>
              <p className="text-sm text-gray-500 font-sans mb-5">
                Supports Chase and compatible Transactions.csv formats
              </p>
              <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-[#15302F] text-[var(--color-warm-beige)] text-sm font-medium rounded-lg hover:bg-[#15302F]/90 transition-colors font-sans">
                Browse File
                <input type="file" accept=".csv,.CSV" onChange={handleFileChange} className="hidden" />
              </label>
              <p className="mt-4 text-xs text-gray-500 font-sans">
                Not sure of the format?{" "}
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-[var(--color-orange)] hover:underline font-medium"
                >
                  Download CSV template
                </button>
              </p>
              {parseError && (
                <p className="mt-3 text-sm text-red-500 font-sans">{parseError}</p>
              )}
            </div>
          ) : (
            /* Preview */
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="font-sans font-medium text-gray-700">
                  <span className="text-[#15302F] font-bold">{parsedRows.length}</span> transactions ready to import
                  {duplicateCount > 0 && (
                    <span className="ml-2 text-xs text-amber-700">
                      ({duplicateCount} possible duplicate{duplicateCount === 1 ? "" : "s"})
                    </span>
                  )}
                </p>
                <button
                  onClick={() => { setParsedRows([]); setKeepDuplicate({}); }}
                  className="text-xs text-gray-400 hover:text-gray-600 font-sans"
                >
                  Change file
                </button>
              </div>

              {duplicateCount > 0 && (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-amber-800 font-sans">
                    <span className="font-semibold">{skipCount}</span> will be skipped,{" "}
                    <span className="font-semibold">{keepCount}</span> will be imported anyway.
                    Tick the checkbox on a duplicate row to import it.
                  </p>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const next: Record<number, boolean> = {};
                        duplicateIndexes.forEach((i) => { next[i] = true; });
                        setKeepDuplicate(next);
                      }}
                      className="text-xs text-amber-800 hover:underline font-medium"
                    >
                      Import all
                    </button>
                    <button
                      type="button"
                      onClick={() => setKeepDuplicate({})}
                      className="text-xs text-amber-800 hover:underline font-medium"
                    >
                      Skip all
                    </button>
                  </div>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm font-sans border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="w-8 px-2 py-2 bg-[#15302F]"></th>
                      <th className="text-left px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium bg-[#15302F]">Date</th>
                      <th className="text-left px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium bg-[#15302F]">Description</th>
                      <th className="text-right px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium bg-[#15302F]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 30).map((row, i) => {
                      const isDup = rowIsDuplicate[i];
                      const keep = !!keepDuplicate[i];
                      return (
                        <tr
                          key={i}
                          className={
                            isDup
                              ? (keep ? "bg-amber-100 text-gray-700" : "bg-amber-50 text-gray-400")
                              : i % 2 === 0 ? "bg-white text-gray-700" : "bg-[#F5EEE4] text-gray-700"
                          }
                        >
                          <td className="w-8 px-2 py-1.5 text-center">
                            {isDup ? (
                              <input
                                type="checkbox"
                                checked={keep}
                                onChange={(e) => setKeepDuplicate((prev) => ({ ...prev, [i]: e.target.checked }))}
                                title={keep ? "Import this duplicate" : "Skip this duplicate"}
                              />
                            ) : (
                              <span className="text-emerald-600 text-[10px]">●</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{row.transactionDate}</td>
                          <td className="px-3 py-1.5 text-xs truncate max-w-xs">
                            {row.description}
                            {isDup && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-amber-700">dup</span>
                            )}
                          </td>
                          <td className={`px-3 py-1.5 text-xs text-right tabular-nums font-medium ${row.amount > 0 ? "text-green-600" : "text-gray-700"}`}>
                            ${Math.abs(row.amount).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                    {parsedRows.length > 30 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-xs text-center text-gray-400">
                          …and {parsedRows.length - 30} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar — indeterminate while a request is in flight */}
        {isImporting && (
          <div className="px-6 pb-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-1/3 animate-pulse bg-[var(--color-orange)]" />
            </div>
            <p className="mt-1 text-[10px] text-gray-500 font-sans uppercase tracking-wide">
              Saving transactions and auto-categorizing…
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose} disabled={isImporting}>Cancel</Button>
          {parsedRows.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting || rowsToImport.length === 0}>
              {isImporting ? "Importing…" : `Import ${rowsToImport.length} Transaction${rowsToImport.length === 1 ? "" : "s"}`}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────────────────────────

interface AddTransactionModalProps {
  onClose: () => void;
  onAdd: (data: { transactionDate: string; description: string; type: string; amount: number; memo?: string }) => Promise<void>;
  isAdding: boolean;
}

function AddTransactionModal({ onClose, onAdd, isAdding }: AddTransactionModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [description, setDescription] = useState("");
  const [type, setType] = useState("Sale");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amt = parseFloat(amount);
    if (!description.trim()) return setError("Description is required.");
    if (isNaN(amt) || amt === 0) return setError("Enter a valid amount.");
    await onAdd({ transactionDate: date, description: description.trim(), type, amount: amt, memo: memo.trim() || undefined });
    onClose();
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg font-sans text-sm focus:outline-none focus:border-[var(--color-orange)] bg-white";
  const labelCls = "block text-xs font-medium text-gray-600 mb-1 font-sans";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[var(--color-cream)] rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="bg-[#15302F] px-6 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[var(--color-warm-beige)]">Add Transaction</h2>
          <button onClick={onClose} className="text-[var(--color-warm-beige)] opacity-60 hover:opacity-100 text-xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} required />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                <option value="Sale">Sale</option>
                <option value="Return">Return</option>
                <option value="Payment">Payment</option>
                <option value="Adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Whole Foods Market"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label className={labelCls}>Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1 font-sans">Use negative for expenses (e.g. -42.50), positive for credits</p>
          </div>

          <div>
            <label className={labelCls}>Memo <span className="text-gray-400 font-normal">(optional)</span></label>
            <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Note…" className={inputCls} />
          </div>

          {error && <p className="text-sm text-red-500 font-sans">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isAdding}>{isAdding ? "Adding…" : "Add Transaction"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Account Select ───────────────────────────────────────────────────────────

const ACCOUNT_TYPES = [
  { value: "credit_card", label: "Credit Card", style: "bg-rose-100 text-rose-700" },
  { value: "checking", label: "Checking", style: "bg-sky-100 text-sky-700" },
  { value: "savings", label: "Savings", style: "bg-emerald-100 text-emerald-700" },
] as const;

interface AccountSelectProps {
  transaction: Transaction;
  onSelect: (id: string, accountType: "credit_card" | "checking" | "savings" | null) => void;
  disabled?: boolean;
}

function AccountSelect({ transaction, onSelect, disabled = false }: AccountSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  const current = ACCOUNT_TYPES.find((a) => a.value === transaction.accountType);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`inline-flex items-center justify-center text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap min-w-[68px] ${
          current ? current.style : "bg-gray-100 text-gray-400 border border-dashed border-gray-300"
        } ${!disabled ? "hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer" : "cursor-default"}`}
        title="Click to set account type"
      >
        {current ? current.label : "—"}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-2xl ring-1 ring-black/5 overflow-hidden min-w-[140px]">
          <button
            onClick={() => { onSelect(transaction.id, null); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-sans text-gray-500"
          >
            Clear
          </button>
          {ACCOUNT_TYPES.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSelect(transaction.id, opt.value); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 font-sans flex items-center gap-2"
            >
              <span className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${opt.style}`}>
                {opt.label}
              </span>
              {transaction.accountType === opt.value && <span className="ml-auto text-gray-400 text-[10px]">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Type Select ──────────────────────────────────────────────────────────────

const BUILT_IN_TYPES = ["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"] as const;
type BuiltInType = (typeof BUILT_IN_TYPES)[number];

const TYPE_STYLES: Record<string, string> = {
  Sale: "bg-[#EEE3D2] text-[#15302F]",
  Return: "bg-green-100 text-green-700",
  Payment: "bg-gray-100 text-gray-500",
  Adjustment: "bg-sky-100 text-sky-700",
  Debit: "bg-orange-100 text-orange-700",
  Credit: "bg-teal-100 text-teal-700",
};

const CUSTOM_TYPE_STYLE = "bg-purple-100 text-purple-700";

interface TypeSelectProps {
  transaction: Transaction;
  customTypes: string[];
  onSelect: (transactionId: string, type: string) => void;
  onAddType: (type: string) => Promise<void>;
  onDeleteType: (type: string) => Promise<void>;
  disabled?: boolean;
}

function TypeSelect({ transaction, customTypes, onSelect, onAddType, onDeleteType, disabled }: TypeSelectProps) {
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState("");
  const [deletingType, setDeletingType] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditMode(false);
        setIsAdding(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = transaction.type;
  const typeStyle = TYPE_STYLES[current] ?? CUSTOM_TYPE_STYLE;
  const allTypes = [...BUILT_IN_TYPES, ...customTypes];

  async function handleAddType(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newType.trim();
    if (!trimmed) return;
    setIsAdding(true);
    await onAddType(trimmed);
    setNewType("");
    setIsAdding(false);
  }

  async function handleDelete(type: string) {
    setDeletingType(type);
    await onDeleteType(type);
    setDeletingType(null);
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${typeStyle} ${
          !disabled ? "hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer" : "cursor-default"
        }`}
        title="Click to change type"
      >
        {current}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-300 rounded-lg shadow-2xl ring-1 ring-black/5 overflow-hidden min-w-[160px]">
          {/* Scrollable list */}
          <div className="max-h-52 overflow-y-auto">
            {allTypes.map((type) => {
              const isCustom = !BUILT_IN_TYPES.includes(type as BuiltInType);
              return (
                <div key={type} className="flex items-center hover:bg-gray-50">
                  <button
                    onClick={() => { if (!editMode) { onSelect(transaction.id, type); setOpen(false); } }}
                    className="flex-1 text-left px-3 py-1.5 text-xs flex items-center gap-2"
                  >
                    <span className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${TYPE_STYLES[type] ?? CUSTOM_TYPE_STYLE}`}>
                      {type}
                    </span>
                    {!editMode && type === current && <span className="ml-auto text-gray-400 text-[10px]">✓</span>}
                  </button>
                  {editMode && isCustom && (
                    <button
                      type="button"
                      onClick={() => handleDelete(type)}
                      disabled={deletingType === type}
                      className="shrink-0 px-2 py-1.5 text-[10px] text-gray-300 hover:text-red-400 disabled:opacity-40"
                      title="Delete type"
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Fixed footer */}
          <div className="border-t border-gray-100">
            {editMode ? (
              isAdding ? (
                <form onSubmit={handleAddType} className="flex items-center gap-1 px-2 py-1.5">
                  <input
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    placeholder="Type name…"
                    className="flex-1 min-w-0 text-xs border border-[var(--color-orange)] rounded px-1.5 py-0.5 font-sans focus:outline-none bg-white"
                    autoFocus
                  />
                  <button type="submit" disabled={!newType.trim()} className="text-xs text-[var(--color-orange)] hover:opacity-70 disabled:opacity-40 font-medium shrink-0">Add</button>
                  <button type="button" onClick={() => { setIsAdding(false); setNewType(""); }} className="text-xs text-gray-400 shrink-0">✕</button>
                </form>
              ) : (
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setIsAdding(true)}
                    className="flex-1 text-left text-xs px-3 py-2 hover:bg-gray-50 font-sans text-[var(--color-orange)]"
                  >
                    ＋ New type
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="text-xs px-3 py-2 hover:bg-gray-50 font-sans text-gray-500 border-l border-gray-100"
                  >
                    Done
                  </button>
                </div>
              )
            ) : (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="w-full text-left text-xs px-3 py-2 hover:bg-gray-50 font-sans text-gray-500 flex items-center gap-1.5"
              >
                <span>✎</span> Edit types
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TransactionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: planId } = use(params);
  const queryClient = useQueryClient();
  const { data: plan } = usePlan(planId);
  const { data: transactions, isLoading } = useTransactions(planId);
  const importMutation = useImportTransactions(planId);
  const assignCategory = useAssignCategory();
  const autoCategorize = useAutoCategorize(planId);
  const deleteTransaction = useDeleteTransaction(planId);
  const restoreTransaction = useRestoreTransaction(planId);
  const { data: deletedTransactions } = useDeletedTransactions(planId);
  const addTransaction = useAddTransaction(planId);
  const updateType = useUpdateTransactionType(planId);
  const updateAccountType = useUpdateTransactionAccountType(planId);
  const addLineItem = useAddLineItem(planId);
  const deleteLineItem = useDeleteLineItem(planId);
  const renameCategory = useRenameCategory(planId);
  const deleteAllTransactions = useDeleteAllTransactions(planId);
  const manageType = useManageTransactionType(planId);
  const [showImport, setShowImport] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastImportSummary, setLastImportSummary] = useState<
    | { imported: number; categorized: number; skippedDuplicates: number; error?: string }
    | null
  >(null);

  // Filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "categorized" | "uncategorized" | "duplicates">("");
  const [filterAccount, setFilterAccount] = useState<"" | "credit_card" | "checking" | "savings" | "none">("");

  const hasFilters = filterCategory || filterKeyword || filterDateFrom || filterDateTo || filterStatus || filterAccount;

  // Subcategories actually assigned to at least one transaction
  // Auto-dismiss the import summary banner after a few seconds (unless it's an error)
  useEffect(() => {
    if (!lastImportSummary || lastImportSummary.error) return;
    const t = setTimeout(() => setLastImportSummary(null), 6000);
    return () => clearTimeout(t);
  }, [lastImportSummary]);

  const usedSubcategories = useMemo(() => {
    if (!transactions) return [];
    const seen = new Set<string>();
    for (const t of transactions) {
      if (t.spendingSubcategory) seen.add(t.spendingSubcategory);
    }
    return Array.from(seen).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    let result = transactions;
    if (filterStatus === "duplicates") {
      result = result.filter((t) => t.isDuplicate);
    } else if (filterStatus === "uncategorized") {
      result = result.filter((t) => !t.spendingCategory);
    } else if (filterStatus === "categorized") {
      result = result.filter((t) => !!t.spendingCategory);
    }
    if (filterCategory) {
      if (filterCategory === "uncategorized") {
        result = result.filter((t) => !t.spendingCategory);
      } else {
        result = result.filter((t) => t.spendingSubcategory === filterCategory);
      }
    }
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      result = result.filter((t) => t.description.toLowerCase().includes(kw));
    }
    if (filterDateFrom) {
      result = result.filter((t) => t.transactionDate >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((t) => t.transactionDate <= filterDateTo);
    }
    if (filterAccount) {
      if (filterAccount === "none") {
        result = result.filter((t) => !t.accountType);
      } else {
        result = result.filter((t) => t.accountType === filterAccount);
      }
    }
    return result;
  }, [transactions, filterCategory, filterKeyword, filterDateFrom, filterDateTo, filterStatus, filterAccount]);

  const categoryOptions: CategoryOption[] = plan
    ? plan.lineItems
        .filter((i) => i.section === "fixed_costs")
        .map((i) => ({
          value: `fixed_costs:${i.label}`,
          label: i.label,
          itemId: i.id,
          section: i.section,
        }))
        .sort((a, b) => a.label.localeCompare(b.label))
    : [];

  function handleCategorySelect(transaction: Transaction, value: string) {
    if (!value) {
      assignCategory.mutate({ transactionId: transaction.id, spendingCategory: null, spendingSubcategory: null });
    } else {
      const colonIdx = value.indexOf(":");
      const category = value.slice(0, colonIdx);
      const subcategory = value.slice(colonIdx + 1);
      assignCategory.mutate({ transactionId: transaction.id, spendingCategory: category || null, spendingSubcategory: subcategory || null });
    }
  }

  async function handleAddCategory(transaction: Transaction, label: string) {
    await addLineItem.mutateAsync({ section: "fixed_costs", label, amount: 0 });
    assignCategory.mutate({ transactionId: transaction.id, spendingCategory: "fixed_costs", spendingSubcategory: label });
  }

  async function handleDeleteCategory(itemId: string) {
    await deleteLineItem.mutateAsync(itemId);
  }

  async function handleRenameCategory(itemId: string, _oldLabel: string, newLabel: string) {
    await renameCategory.mutateAsync({ itemId, newLabel });
  }

  const customTypes = plan?.customTransactionTypes ?? [];

  async function handleAddType(type: string) {
    await manageType.mutateAsync({ action: "add", type });
  }

  async function handleDeleteType(type: string) {
    await manageType.mutateAsync({ action: "remove", type });
  }

  // Auto-categorize freshly imported transactions in the background. Kept
  // separate from handleImport so the import modal can close as soon as the rows
  // are inserted — categorization can take a while and must not block the modal.
  async function categorizeImported(
    newTxs: { id: string; description: string }[],
    skippedDuplicates: number
  ) {
    try {
      const descriptions = newTxs.map((t) => t.description);
      const suggestions = await autoCategorize.mutateAsync(descriptions) as Record<string, { spendingCategory: string; spendingSubcategory: string }>;

      let categorized = 0;
      for (const t of newTxs) {
        const s = suggestions[t.description];
        if (s) {
          await assignCategory.mutateAsync({
            transactionId: t.id,
            spendingCategory: s.spendingCategory,
            spendingSubcategory: s.spendingSubcategory,
          });
          categorized++;
        }
      }
      setLastImportSummary({ imported: newTxs.length, categorized, skippedDuplicates });
    } catch {
      // Insert already succeeded; leave the imported summary as-is if
      // auto-categorization fails — the user can categorize manually.
    }
  }

  async function handleImport(rows: CsvTransaction[], skippedDuplicates = 0) {
    try {
      const result = await importMutation.mutateAsync(rows) as { transactions: { id: string; description: string }[] };
      const newTxs = result?.transactions ?? [];

      // CRITICAL: await the refetch triggered by useImportTransactions.onSuccess
      // before firing any assignCategory mutations. assignCategory.onMutate calls
      // cancelQueries({ queryKey: ["transactions"] }) which would kill the in-flight
      // refetch — leaving the new transactions invisible until the next page load.
      await queryClient.refetchQueries({ queryKey: ["transactions", planId], exact: true });

      // Show the insert result immediately and let the modal close. Auto-
      // categorization continues in the background and updates the summary.
      setLastImportSummary({ imported: newTxs.length, categorized: 0, skippedDuplicates });
      if (newTxs.length > 0) {
        void categorizeImported(newTxs, skippedDuplicates);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed.";
      setLastImportSummary({ imported: 0, categorized: 0, skippedDuplicates, error: message });
      throw err;
    }
  }

  async function handleAutoCategorize() {
    if (!transactions) return;
    const uncategorized = transactions.filter((t) => !t.spendingCategory);
    if (uncategorized.length === 0) return;
    const descriptions = uncategorized.map((t) => t.description);
    const suggestions = await autoCategorize.mutateAsync(descriptions) as Record<string, { spendingCategory: string; spendingSubcategory: string }>;
    for (const t of uncategorized) {
      const s = suggestions[t.description];
      if (s) {
        assignCategory.mutate({ transactionId: t.id, spendingCategory: s.spendingCategory, spendingSubcategory: s.spendingSubcategory });
      }
    }
  }

  const uncategorizedCount = transactions?.filter((t) => !t.spendingCategory).length ?? 0;
  const duplicateCount = transactions?.filter((t) => t.isDuplicate).length ?? 0;

  return (
    <div className="space-y-6">
      <GuidedTour tourId="transactions" steps={TRANSACTIONS_TOUR} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#15302F] flex items-center gap-2">
            Transactions
            {plan?.isLocked && (
              <span
                className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] uppercase tracking-wide font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                title="Unlock this plan from the plan page to edit categories."
              >
                <span aria-hidden>🔒</span> Locked
              </span>
            )}
          </h2>
          {transactions && transactions.length > 0 && (
            <p className="text-sm text-gray-500 font-sans mt-0.5">
              {transactions.length} total
              {uncategorizedCount > 0 && (
                <span className="ml-1 text-[var(--color-orange)]">· {uncategorizedCount} uncategorized</span>
              )}
              {duplicateCount > 0 && (
                <span className="ml-1 text-amber-600">· {duplicateCount} duplicate{duplicateCount > 1 ? "s" : ""}</span>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {transactions && transactions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              className="text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              Reset Plan
            </Button>
          )}
          {transactions && transactions.length > 0 && (
            <span data-tour="tx-filters">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters((v) => !v)}
              >
                {showFilters ? "Hide Filters" : "Filters"}
              </Button>
            </span>
          )}
          {transactions && transactions.length > 0 && uncategorizedCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAutoCategorize}
              disabled={autoCategorize.isPending}
            >
              {autoCategorize.isPending ? "Auto-categorizing…" : "Auto-Categorize"}
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setShowAddTransaction(true)}>+ Add Transaction</Button>
          <span data-tour="tx-import">
            <Button onClick={() => setShowImport(true)}>Import CSV</Button>
          </span>
        </div>
      </div>

      {/* Import Summary Banner */}
      {lastImportSummary && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-sans border ${
            lastImportSummary.error
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
          role="status"
        >
          <div>
            {lastImportSummary.error ? (
              <>
                <span className="font-semibold">Import failed.</span>{" "}
                <span className="opacity-80">{lastImportSummary.error}</span>
              </>
            ) : (
              <>
                <span className="font-semibold">Imported {lastImportSummary.imported} transaction{lastImportSummary.imported === 1 ? "" : "s"}.</span>{" "}
                <span className="opacity-80">
                  {lastImportSummary.categorized} auto-categorized
                  {lastImportSummary.skippedDuplicates > 0 && (
                    <> · {lastImportSummary.skippedDuplicates} duplicate{lastImportSummary.skippedDuplicates === 1 ? "" : "s"} skipped</>
                  )}
                </span>
              </>
            )}
          </div>
          <button
            onClick={() => setLastImportSummary(null)}
            className="text-xs opacity-60 hover:opacity-100 shrink-0"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Background auto-categorization indicator */}
      {(autoCategorize.isPending || assignCategory.isPending) && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-sans bg-blue-50 border border-blue-200 text-blue-700" role="status">
          <span className="inline-block w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          Auto-categorizing imported transactions…
        </div>
      )}

      {/* Filter Bar */}
      {transactions && transactions.length > 0 && showFilters && (
        <div className="flex flex-wrap items-end gap-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex-1 min-w-[140px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">Search</label>
            <input
              type="text"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="Description..."
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            >
              <option value="">All</option>
              <option value="categorized">Categorized</option>
              <option value="uncategorized">Uncategorized</option>
              <option value="duplicates">Duplicates</option>
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            >
              <option value="">All</option>
              {usedSubcategories.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">Account</label>
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value as typeof filterAccount)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            >
              <option value="">All</option>
              <option value="credit_card">Credit Card</option>
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="none">Unset</option>
            </select>
          </div>
          <div className="min-w-[120px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            />
          </div>
          {hasFilters && (
            <button
              onClick={() => { setFilterCategory(""); setFilterKeyword(""); setFilterDateFrom(""); setFilterDateTo(""); setFilterStatus(""); setFilterAccount(""); }}
              className="text-xs text-[var(--color-orange)] hover:underline font-sans font-medium py-1.5"
            >
              Clear
            </button>
          )}
          {hasFilters && (
            <span className="text-xs text-gray-400 font-sans py-1.5">
              {filteredTransactions.length} of {transactions.length}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 font-sans text-sm">Loading transactions…</div>
      ) : !transactions || transactions.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-display text-lg font-bold text-[#15302F] mb-2">No transactions yet</h3>
          <p className="text-sm text-gray-500 font-sans mb-6 max-w-sm mx-auto">
            Import your bank CSV or add individual transactions to start categorizing and track where your money goes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="secondary" onClick={() => setShowAddTransaction(true)}>+ Add Transaction</Button>
            <Button onClick={() => setShowImport(true)}>Import CSV</Button>
          </div>
        </div>
      ) : (
        /* Transactions Table */
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100 max-w-5xl mx-auto">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="bg-[#15302F]">
                  <th className="text-left px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-24">Date</th>
                  <th className="text-left px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide">Description</th>
                  <th className="text-left px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-28">Type</th>
                  <th className="text-left px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-28">Account</th>
                  <th className="text-right px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-24">Amount</th>
                  <th className="text-left px-2 py-2.5 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-44">Category</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`border-t border-gray-100 transition-colors hover:bg-[#F5EEE4]/60 group ${
                      t.isDuplicate ? "opacity-60" : i % 2 === 0 ? "bg-white" : "bg-[#F5EEE4]/30"
                    }`}
                  >
                    <td className="px-2 py-2 text-xs text-gray-500 whitespace-nowrap w-24">{t.transactionDate}</td>
                    <td className="px-2 py-2 max-w-[200px]">
                      <div className="flex items-center gap-1 truncate">
                        <span className="truncate text-gray-800 text-xs">{t.description}</span>
                        {!t.isManual && (
                          <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">imp</span>
                        )}
                        {t.isDuplicate && (
                          <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">dup</span>
                        )}
                        {t.isManual && (
                          <span className="shrink-0 text-[9px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">man</span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 w-28">
                      <TypeSelect
                        transaction={t}
                        customTypes={customTypes}
                        onSelect={(transactionId, type) => updateType.mutate({ transactionId, type })}
                        onAddType={handleAddType}
                        onDeleteType={handleDeleteType}
                        disabled={updateType.isPending}
                      />
                    </td>
                    <td className="px-2 py-2 w-28">
                      <AccountSelect
                        transaction={t}
                        onSelect={(transactionId, accountType) => updateAccountType.mutate({ transactionId, accountType })}
                        disabled={updateAccountType.isPending}
                      />
                    </td>
                    <td className={`px-2 py-2 text-right tabular-nums font-medium text-xs w-24 ${
                      t.amount > 0 ? "text-green-600" : "text-gray-800"
                    }`}>
                      ${Math.abs(Number(t.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-1.5 w-44">
                      <CategorySelect
                        transaction={t}
                        categories={categoryOptions}
                        onSelect={handleCategorySelect}
                        onAdd={handleAddCategory}
                        onDelete={handleDeleteCategory}
                        onRename={handleRenameCategory}
                        locked={plan?.isLocked}
                      />
                    </td>
                    <td className="pr-2 py-2 text-right w-6">
                      <button
                        onClick={() => deleteTransaction.mutate(t.id)}
                        disabled={deleteTransaction.isPending}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all text-xs disabled:opacity-40"
                        title="Delete transaction"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deleted Transactions */}
      {deletedTransactions && deletedTransactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-sans font-medium text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <span>Deleted Transactions ({deletedTransactions.length})</span>
            <span className="text-xs">{showDeleted ? "\u25B2" : "\u25BC"}</span>
          </button>
          {showDeleted && (
            <div className="border-t border-gray-100">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left px-4 py-2 text-gray-500 text-xs font-semibold">Date</th>
                    <th className="text-left px-4 py-2 text-gray-500 text-xs font-semibold">Description</th>
                    <th className="text-right px-4 py-2 text-gray-500 text-xs font-semibold">Amount</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {deletedTransactions.map((t, i) => (
                    <tr key={t.id} className={`border-t border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-2 text-xs text-gray-400 whitespace-nowrap">{t.transactionDate}</td>
                      <td className="px-4 py-2 text-xs text-gray-400 truncate max-w-xs">{t.description}</td>
                      <td className="px-4 py-2 text-xs text-right tabular-nums text-gray-400">
                        ${Math.abs(Number(t.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => restoreTransaction.mutate(t.id)}
                          disabled={restoreTransaction.isPending}
                          className="text-xs text-[var(--color-orange)] hover:underline font-medium disabled:opacity-40"
                        >
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImport={handleImport}
          isImporting={importMutation.isPending}
          existingTransactions={transactions ?? []}
        />
      )}

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <AddTransactionModal
          onClose={() => setShowAddTransaction(false)}
          onAdd={async (data) => { await addTransaction.mutateAsync({ ...data, type: data.type as "Sale" | "Return" | "Payment" | "Adjustment" | "Debit" | "Credit" }); }}
          isAdding={addTransaction.isPending}
        />
      )}

      {/* Reset Plan Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setShowResetConfirm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="bg-red-600 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-white">Reset Plan</h2>
            </div>
            <div className="p-6 space-y-3">
              <p className="text-sm text-gray-700 font-sans">
                This will <span className="font-semibold text-red-600">permanently delete all {transactions?.length} transactions</span> for this plan. This cannot be undone.
              </p>
              <p className="text-xs text-gray-500 font-sans">Are you sure you want to continue?</p>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  await deleteAllTransactions.mutateAsync();
                  setShowResetConfirm(false);
                }}
                disabled={deleteAllTransactions.isPending}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteAllTransactions.isPending ? "Deleting…" : "Yes, delete all"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
