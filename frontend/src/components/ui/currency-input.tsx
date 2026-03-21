"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
  className?: string;
}

/**
 * Currency input that displays formatted value ($X,XXX.XX) on blur
 * and raw number on focus for editing.
 */
export function CurrencyInput({
  value,
  onChange,
  readOnly = false,
  className = "",
}: CurrencyInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(String(value || ""));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(String(value || ""));
    }
  }, [value, isFocused]);

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDisplayValue(value ? String(value) : "");
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const num = parseFloat(displayValue) || 0;
    onChange(num);
    setDisplayValue(String(num));
  }, [displayValue, onChange]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") inputRef.current?.blur();
    },
    []
  );

  if (readOnly) {
    return (
      <span
        className={`block w-full text-right font-sans tabular-nums ${className}`}
      >
        {formatCurrency(value)}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={isFocused ? displayValue : formatCurrency(value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      className={`w-full text-right bg-transparent border border-gray-200 rounded px-2 py-1
        focus:outline-none focus:border-[var(--color-orange)] focus:ring-1 focus:ring-[var(--color-orange)]
        font-sans tabular-nums ${className}`}
    />
  );
}
