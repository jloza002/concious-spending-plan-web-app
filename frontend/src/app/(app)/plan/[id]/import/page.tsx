"use client";

import { use, useState, useMemo, useRef, useEffect } from "react";
import Papa from "papaparse";
import { usePlan } from "@/hooks/use-spending-plan";
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
  useDeleteAllTransactions,
} from "@/hooks/use-transactions";
import { Button } from "@/components/ui/button";
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
}

function CategorySelect({ transaction, categories, onSelect, onAdd, onDelete, onRename }: CategorySelectProps) {
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

  const currentLabel =
    transaction.spendingSubcategory ||
    (transaction.spendingCategory ? SECTION_LABELS[transaction.spendingCategory] ?? transaction.spendingCategory : "");
  const isCategorized = !!transaction.spendingCategory;

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
        <div className={`absolute z-30 left-0 w-72 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden ${dropUp ? "bottom-full mb-1" : "mt-1"}`}>
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
        </div>
      )}
    </div>
  );
}

// ─── Import Modal ─────────────────────────────────────────────────────────────

interface ImportModalProps {
  onClose: () => void;
  onImport: (rows: CsvTransaction[]) => Promise<void>;
  isImporting: boolean;
}

function ImportModal({ onClose, onImport, isImporting }: ImportModalProps) {
  const [parsedRows, setParsedRows] = useState<CsvTransaction[]>([]);
  const [parseError, setParseError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

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
    if (parsedRows.length === 0) return;
    await onImport(parsedRows);
    onClose();
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
                </p>
                <button
                  onClick={() => setParsedRows([])}
                  className="text-xs text-gray-400 hover:text-gray-600 font-sans"
                >
                  Change file
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm font-sans">
                  <thead className="bg-[#15302F] sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium">Date</th>
                      <th className="text-left px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium">Description</th>
                      <th className="text-right px-3 py-2 text-[var(--color-warm-beige)] text-xs font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 15).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-[#F5EEE4]"}>
                        <td className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">{row.transactionDate}</td>
                        <td className="px-3 py-1.5 text-xs truncate max-w-xs">{row.description}</td>
                        <td className={`px-3 py-1.5 text-xs text-right tabular-nums font-medium ${row.amount > 0 ? "text-green-600" : "text-gray-700"}`}>
                          ${Math.abs(row.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {parsedRows.length > 15 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-xs text-center text-gray-400">
                          …and {parsedRows.length - 15} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          {parsedRows.length > 0 && (
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? "Importing…" : `Import ${parsedRows.length} Transactions`}
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

// ─── Type Select ──────────────────────────────────────────────────────────────

const TRANSACTION_TYPES = ["Sale", "Return", "Payment", "Adjustment", "Debit", "Credit"] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

const TYPE_STYLES: Record<TransactionType, string> = {
  Sale: "bg-[#EEE3D2] text-[#15302F]",
  Return: "bg-green-100 text-green-700",
  Payment: "bg-gray-100 text-gray-500",
  Adjustment: "bg-sky-100 text-sky-700",
  Debit: "bg-orange-100 text-orange-700",
  Credit: "bg-teal-100 text-teal-700",
};

interface TypeSelectProps {
  transaction: Transaction;
  onSelect: (transactionId: string, type: TransactionType) => void;
  disabled?: boolean;
}

function TypeSelect({ transaction, onSelect, disabled }: TypeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = transaction.type as TransactionType;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => !disabled && setOpen((v) => !v)}
        disabled={disabled}
        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${TYPE_STYLES[current]} ${
          !disabled ? "hover:ring-2 hover:ring-offset-1 hover:ring-gray-300 cursor-pointer" : "cursor-default"
        }`}
        title="Click to change type"
      >
        {current}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
          {TRANSACTION_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => { onSelect(transaction.id, type); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-gray-50 transition-colors ${
                type === current ? "font-semibold" : ""
              }`}
            >
              <span className={`inline-block px-1.5 py-0.5 rounded-full font-medium ${TYPE_STYLES[type]}`}>
                {type}
              </span>
              {type === current && <span className="ml-auto text-gray-400">✓</span>}
            </button>
          ))}
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
  const addLineItem = useAddLineItem(planId);
  const deleteLineItem = useDeleteLineItem(planId);
  const renameCategory = useRenameCategory(planId);
  const deleteAllTransactions = useDeleteAllTransactions(planId);
  const [showImport, setShowImport] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const hasFilters = filterCategory || filterKeyword || filterDateFrom || filterDateTo;

  // Subcategories actually assigned to at least one transaction
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
    return result;
  }, [transactions, filterCategory, filterKeyword, filterDateFrom, filterDateTo]);

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

  async function handleImport(rows: CsvTransaction[]) {
    const result = await importMutation.mutateAsync(rows) as { transactions: { id: string; description: string }[] };
    // Auto-categorize newly imported transactions using existing memory
    const newTxs = result?.transactions ?? [];
    if (newTxs.length === 0) return;
    const descriptions = newTxs.map((t) => t.description);
    const suggestions = await autoCategorize.mutateAsync(descriptions) as Record<string, { spendingCategory: string; spendingSubcategory: string }>;
    for (const t of newTxs) {
      const s = suggestions[t.description];
      if (s) {
        assignCategory.mutate({ transactionId: t.id, spendingCategory: s.spendingCategory, spendingSubcategory: s.spendingSubcategory });
      }
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-[#15302F]">Transactions</h2>
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
            >
              {showFilters ? "Hide Filters" : "Filters"}
            </Button>
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
          <Button onClick={() => setShowImport(true)}>Import CSV</Button>
        </div>
      </div>

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
            <label className="block text-[10px] font-medium text-gray-500 mb-1 font-sans uppercase tracking-wide">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-sans focus:outline-none focus:border-[var(--color-orange)] bg-white"
            >
              <option value="">All</option>
              <option value="uncategorized">Uncategorized</option>
              {usedSubcategories.map((sub) => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
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
              onClick={() => { setFilterCategory(""); setFilterKeyword(""); setFilterDateFrom(""); setFilterDateTo(""); }}
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
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead>
                <tr className="bg-[#15302F]">
                  <th className="text-left px-4 py-3 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-[var(--color-warm-beige)] text-xs font-semibold tracking-wide w-52">Category</th>
                  <th className="w-8"></th>
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
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{t.transactionDate}</td>
                    <td className="px-4 py-2.5 max-w-xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate text-gray-800">{t.description}</span>
                        {!t.isManual && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">import</span>
                        )}
                        {t.isDuplicate && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">duplicate</span>
                        )}
                        {t.isManual && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">manual</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <TypeSelect
                        transaction={t}
                        onSelect={(transactionId, type) =>
                          updateType.mutate({ transactionId, type })
                        }
                        disabled={updateType.isPending}
                      />
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${
                      t.amount > 0 ? "text-green-600" : "text-gray-800"
                    }`}>
                      ${Math.abs(Number(t.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 w-52">
                      <CategorySelect
                        transaction={t}
                        categories={categoryOptions}
                        onSelect={handleCategorySelect}
                        onAdd={handleAddCategory}
                        onDelete={handleDeleteCategory}
                        onRename={handleRenameCategory}
                      />
                    </td>
                    <td className="pr-3 py-2 text-right">
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
