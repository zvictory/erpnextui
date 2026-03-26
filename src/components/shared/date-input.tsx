"use client";

import { useEffect, useRef, useCallback } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import type { DateFormat } from "@/stores/ui-settings-store";

const DATE_FORMAT_TO_FLATPICKR: Record<DateFormat, string> = {
  "yyyy-MM-dd": "Y-m-d",
  "dd/MM/yyyy": "d/m/Y",
  "MM/dd/yyyy": "m/d/Y",
  "dd MMM yyyy": "d M Y",
  "MMM dd, yyyy": "M d, Y",
};

const ALT_INPUT_CLASS = [
  "border-input bg-background text-foreground placeholder:text-muted-foreground",
  "flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs",
  "transition-[color,box-shadow] outline-none",
  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
].join(" ");

interface DateInputProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { name?: string; value: string } }) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  min?: string;
  placeholder?: string;
}

export function DateInput({
  id,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  disabled,
  required,
  min,
  placeholder = "Select date",
}: DateInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);

  const handleChange = useCallback(
    (dates: Date[]) => {
      if (dates.length === 0) return;
      const yyyy = dates[0].getFullYear();
      const mm = String(dates[0].getMonth() + 1).padStart(2, "0");
      const dd = String(dates[0].getDate()).padStart(2, "0");
      onChange?.({ target: { name, value: `${yyyy}-${mm}-${dd}` } });
    },
    [onChange, name],
  );

  const dateFormat = useUISettingsStore((s) => s.dateFormat);
  const altFormat = DATE_FORMAT_TO_FLATPICKR[dateFormat] || "d M Y";

  useEffect(() => {
    if (!inputRef.current) return;

    const fp = flatpickr(inputRef.current, {
      dateFormat: "Y-m-d",
      altInput: true,
      altFormat,
      altInputClass: ALT_INPUT_CLASS,
      defaultDate: value || defaultValue || undefined,
      minDate: min || undefined,
      allowInput: true,
      onChange: handleChange,
      onOpen() {
        // Radix Dialog sets `inert` on body-level siblings, which blocks the
        // flatpickr calendar (appended to <body>). Remove it when opening.
        const cal = fp.calendarContainer;
        if (cal) {
          cal.removeAttribute("inert");
          cal.removeAttribute("aria-hidden");
        }
      },
    });
    fpRef.current = fp;

    // Ensure original input is fully hidden
    if (inputRef.current) {
      inputRef.current.style.display = "none";
    }

    return () => fp.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [altFormat]);

  // Sync value changes from outside
  useEffect(() => {
    if (fpRef.current && value !== undefined) {
      const currentDate = fpRef.current.selectedDates[0];
      const currentStr = currentDate
        ? `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`
        : "";
      if (value !== currentStr) {
        fpRef.current.setDate(value, false);
      }
    }
  }, [value]);

  // Sync min date changes
  useEffect(() => {
    if (fpRef.current && min !== undefined) {
      fpRef.current.set("minDate", min || undefined);
    }
  }, [min]);

  // Sync disabled
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const altInput = container.querySelector<HTMLInputElement>(
      "input.flatpickr-input:not([type=hidden])",
    );
    if (altInput) {
      altInput.disabled = !!disabled;
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        name={name}
        required={required}
        disabled={disabled}
        onBlur={onBlur}
        placeholder={placeholder}
      />
    </div>
  );
}
