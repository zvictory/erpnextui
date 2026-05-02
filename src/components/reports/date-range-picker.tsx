"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
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

  // Custom text inputs state — kept in sync with dateRange
  const [customFrom, setCustomFrom] = useState(() => format(dateRange.from, "yyyy-MM-dd"));
  const [customTo, setCustomTo] = useState(() => format(dateRange.to, "yyyy-MM-dd"));

  // Reset custom inputs whenever the popover opens or dateRange changes externally
  useEffect(() => {
    setCustomFrom(format(dateRange.from, "yyyy-MM-dd"));
    setCustomTo(format(dateRange.to, "yyyy-MM-dd"));
  }, [dateRange]);

  const applyCustom = useCallback(() => {
    const from = new Date(customFrom);
    const to = new Date(customTo);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) return;
    onDateRangeChange({ from, to });
    setOpen(false);
  }, [customFrom, customTo, onDateRangeChange]);

  useEffect(() => {
    if (!open || !calendarRef.current) return;

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
          {/* Presets sidebar */}
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

          {/* Calendar + custom inputs */}
          <div className="flex flex-col">
            <div className="p-3">
              <div ref={calendarRef} />
            </div>
            <Separator />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-7 text-xs w-[130px]"
              />
              <span className="text-muted-foreground text-xs">–</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-7 text-xs w-[130px]"
              />
              <Button size="sm" className="h-7 px-3 text-xs" onClick={applyCustom}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
