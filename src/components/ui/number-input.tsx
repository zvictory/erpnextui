"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useUISettingsStore } from "@/stores/ui-settings-store";

interface NumberInputProps {
  value: number | string | undefined;
  onChange: (value: number) => void;
  decimals?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  min?: number;
  max?: number;
  readOnly?: boolean;
  tabIndex?: number;
}

function getSeparators(numberFormat: string) {
  if (numberFormat === "1,234.56") return { decimal: ".", thousands: "," };
  if (numberFormat === "1.234,56") return { decimal: ",", thousands: "." };
  // "1 234,56" (default)
  return { decimal: ",", thousands: "\u00A0" }; // non-breaking space
}

function toFormattedDisplay(val: number | string | undefined | null, decimals: number): string {
  if (val === undefined || val === null || val === "") return "";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "";
  return formatNumber(num, decimals);
}

function parseDisplay(str: string, decimalSep: string, thousandsSep: string): number {
  if (!str || str === "-") return 0;
  // Remove thousands separators
  let clean = str.split(thousandsSep).join("");
  // Replace locale decimal separator with "."
  if (decimalSep !== ".") {
    clean = clean.replace(decimalSep, ".");
  }
  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
}

/**
 * Reformat raw input with locale thousand grouping while preserving the
 * user's in-progress decimal portion (no auto-pad to fixed decimals).
 */
function formatWhileTyping(raw: string, decimalSep: string, thousandsSep: string): string {
  const sign = raw.trim().startsWith("-") ? "-" : "";
  // Keep only digits and the locale decimal sep
  const escapedDecimal = decimalSep.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = raw.replace(new RegExp(`[^0-9${escapedDecimal}]`, "g"), "");
  const decIdx = stripped.indexOf(decimalSep);
  const intPart = decIdx === -1 ? stripped : stripped.slice(0, decIdx);
  const decPart =
    decIdx === -1
      ? null
      : stripped.slice(decIdx + 1).replace(new RegExp(escapedDecimal, "g"), "");
  let grouped = "";
  if (intPart.length > 0) {
    const chunks: string[] = [];
    for (let i = intPart.length; i > 0; i -= 3) {
      chunks.unshift(intPart.slice(Math.max(0, i - 3), i));
    }
    grouped = chunks.join(thousandsSep);
  }
  return sign + grouped + (decPart !== null ? decimalSep + decPart : "");
}

function placeCursor(
  input: HTMLInputElement,
  raw: string,
  formatted: string,
  oldCursorPos: number,
  thousandsSep: string,
) {
  const significantBefore = raw
    .slice(0, oldCursorPos)
    .split("")
    .filter((c) => c !== thousandsSep).length;
  let pos = 0;
  let count = 0;
  while (pos < formatted.length && count < significantBefore) {
    if (formatted[pos] !== thousandsSep) count++;
    pos++;
  }
  requestAnimationFrame(() => {
    if (document.activeElement === input) {
      input.setSelectionRange(pos, pos);
    }
  });
}

function NumberInput({
  value,
  onChange,
  decimals = 2,
  placeholder,
  className,
  disabled,
  id,
  min,
  max,
  readOnly,
  tabIndex,
}: NumberInputProps) {
  const numberFormat = useUISettingsStore((s) => s.numberFormat);
  const { decimal: decimalSep, thousands: thousandsSep } = getSeparators(numberFormat);

  // When focused, we track the raw user input in localDisplay.
  // When not focused, we derive the display from the external `value` prop.
  const [isFocused, setIsFocused] = useState(false);
  const [localDisplay, setLocalDisplay] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // The displayed value: derived when blurred, local state when focused
  const display = isFocused ? localDisplay : toFormattedDisplay(value, decimals);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const cursorPos = e.target.selectionStart ?? raw.length;
      const formatted = formatWhileTyping(raw, decimalSep, thousandsSep);

      setLocalDisplay(formatted);
      placeCursor(e.target, raw, formatted, cursorPos, thousandsSep);

      const num = parseDisplay(formatted, decimalSep, thousandsSep);
      if (!isNaN(num)) {
        let clamped = num;
        if (min !== undefined && clamped < min) clamped = min;
        if (max !== undefined && clamped > max) clamped = max;
        onChange(clamped);
      }
    },
    [decimalSep, thousandsSep, min, max, onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const input = e.currentTarget;
      if (input.selectionStart !== input.selectionEnd) return;
      const pos = input.selectionStart ?? 0;
      if (e.key === "Backspace" && pos >= 2 && input.value[pos - 1] === thousandsSep) {
        // Select the digit + separator so default backspace deletes both
        input.setSelectionRange(pos - 2, pos);
      } else if (
        e.key === "Delete" &&
        pos < input.value.length - 1 &&
        input.value[pos] === thousandsSep
      ) {
        input.setSelectionRange(pos, pos + 2);
      }
    },
    [thousandsSep],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // On focus, seed localDisplay with a plain (no thousands) version for easier editing
      const val = value;
      if (val === undefined || val === null || val === "") {
        setLocalDisplay("");
      } else {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (isNaN(num) || num === 0) {
          setLocalDisplay("");
        } else {
          const plain = String(num);
          const localized = decimalSep !== "." ? plain.replace(".", decimalSep) : plain;
          setLocalDisplay(formatWhileTyping(localized, decimalSep, thousandsSep));
        }
      }
      setIsFocused(true);
      // Select all text for quick replacement
      requestAnimationFrame(() => {
        e.target.select();
      });
    },
    [value, decimalSep, thousandsSep],
  );

  const handleBlur = useCallback(() => {
    // Parse, clamp, and notify parent with final value
    const num = parseDisplay(localDisplay, decimalSep, thousandsSep);
    let clamped = num;
    if (min !== undefined && clamped < min) clamped = min;
    if (max !== undefined && clamped > max) clamped = max;
    onChange(clamped);
    setIsFocused(false);
    // Display will now be derived from the `value` prop (formatted)
  }, [localDisplay, decimalSep, thousandsSep, min, max, onChange]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      data-slot="input"
      value={display}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        "text-right",
        className,
      )}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      id={id}
      tabIndex={tabIndex}
    />
  );
}

export { NumberInput };
export type { NumberInputProps };
