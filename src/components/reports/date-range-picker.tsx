"use client";

import { useEffect, useRef, useState } from "react";
import { format, startOfMonth, startOfQuarter, startOfYear, subYears } from "date-fns";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DateRange } from "@/types/reports";

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const presets = [
  {
    label: "This Month",
    range: (): DateRange => ({
      from: startOfMonth(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "This Quarter",
    range: (): DateRange => ({
      from: startOfQuarter(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "This Year",
    range: (): DateRange => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
  {
    label: "Last Year",
    range: (): DateRange => {
      const lastYear = subYears(new Date(), 1);
      return {
        from: startOfYear(lastYear),
        to: new Date(lastYear.getFullYear(), 11, 31),
      };
    },
  },
];

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);

  useEffect(() => {
    if (!open || !calendarRef.current) return;

    // Small delay to let popover render
    const timer = setTimeout(() => {
      if (!calendarRef.current) return;
      const fp = flatpickr(calendarRef.current, {
        mode: "range",
        inline: true,
        showMonths: 2,
        dateFormat: "Y-m-d",
        defaultDate: [dateRange.from, dateRange.to],
        onChange: (dates) => {
          if (dates.length === 2) {
            onDateRangeChange({ from: dates[0], to: dates[1] });
            setOpen(false);
          }
        },
      });
      fpRef.current = fp;
    }, 0);

    return () => {
      clearTimeout(timer);
      fpRef.current?.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Sync external date changes when open
  useEffect(() => {
    if (fpRef.current && open) {
      fpRef.current.setDate([dateRange.from, dateRange.to], false);
    }
  }, [dateRange, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 font-normal">
          <CalendarIcon className="size-4" />
          <span>
            {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => {
                  onDateRangeChange(preset.range());
                  setOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <div ref={calendarRef} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
