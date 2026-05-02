"use client";

import { useEffect, useRef, useState } from "react";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
} from "date-fns";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import type { DateRange } from "@/types/reports";

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

type PresetGroup = { label: string; presets: { label: string; range: () => DateRange }[] };

const presetGroups: PresetGroup[] = [
  {
    label: "Days",
    presets: [
      {
        label: "Today",
        range: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
      },
      {
        label: "Yesterday",
        range: () => {
          const d = subDays(new Date(), 1);
          return { from: startOfDay(d), to: endOfDay(d) };
        },
      },
      {
        label: "Last 7 days",
        range: () => ({ from: startOfDay(subDays(new Date(), 6)), to: new Date() }),
      },
      {
        label: "Last 30 days",
        range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: new Date() }),
      },
    ],
  },
  {
    label: "Months",
    presets: [
      {
        label: "This month",
        range: () => ({ from: startOfMonth(new Date()), to: new Date() }),
      },
      {
        label: "Last month",
        range: () => {
          const prev = subMonths(new Date(), 1);
          return { from: startOfMonth(prev), to: endOfMonth(prev) };
        },
      },
    ],
  },
  {
    label: "Quarters",
    presets: [
      {
        label: "This quarter",
        range: () => ({ from: startOfQuarter(new Date()), to: new Date() }),
      },
      {
        label: "Last quarter",
        range: () => {
          const prev = subQuarters(new Date(), 1);
          return { from: startOfQuarter(prev), to: endOfQuarter(prev) };
        },
      },
    ],
  },
  {
    label: "Years",
    presets: [
      {
        label: "This year",
        range: () => ({ from: startOfYear(new Date()), to: new Date() }),
      },
      {
        label: "Last year",
        range: () => {
          const prev = subYears(new Date(), 1);
          return { from: startOfYear(prev), to: endOfYear(prev) };
        },
      },
    ],
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
          <div className="flex flex-col border-r w-[140px] py-2">
            {presetGroups.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <Separator className="my-1.5" />}
                <p className="px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                {group.presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 px-3 text-sm font-normal"
                    onClick={() => {
                      onDateRangeChange(preset.range());
                      setOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
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
