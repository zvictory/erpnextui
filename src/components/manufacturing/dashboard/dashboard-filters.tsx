"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, FilterX, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Line {
  id: number;
  name: string;
}

export function DashboardFilters({ lines }: { lines: Line[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentDateFrom = searchParams.get("dateFrom") ?? "";
  const currentDateTo = searchParams.get("dateTo") ?? "";
  const currentLineIds = searchParams.get("lineIds")?.split(",").filter(Boolean).map(Number) ?? [];

  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    currentDateFrom ? parseISO(currentDateFrom) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    currentDateTo ? parseISO(currentDateTo) : undefined
  );
  const [selectedLineIds, setSelectedLineIds] = useState<number[]>(currentLineIds);

  const handleLineToggle = useCallback((lineId: number, checked: boolean) => {
    setSelectedLineIds((prev) =>
      checked ? [...prev, lineId] : prev.filter((id) => id !== lineId)
    );
  }, []);

  const handleApply = useCallback(() => {
    const params = new URLSearchParams();

    if (dateFrom) {
      params.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    }
    if (dateTo) {
      params.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    }
    if (selectedLineIds.length > 0) {
      params.set("lineIds", selectedLineIds.join(","));
    }

    const queryString = params.toString();
    router.push(queryString ? `/?${queryString}` : "/");
  }, [dateFrom, dateTo, selectedLineIds, router]);

  const handleReset = useCallback(() => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedLineIds([]);
    router.push("/");
  }, [router]);

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-card p-4">
      {/* Date From */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">From</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[160px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 size-4" />
              {dateFrom ? format(dateFrom, "MMM d, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFrom}
              onSelect={setDateFrom}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">To</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-[160px] justify-start text-left font-normal"
            >
              <CalendarIcon className="mr-2 size-4" />
              {dateTo ? format(dateTo, "MMM d, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateTo}
              onSelect={setDateTo}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Line Selector */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground">Production Lines</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
              {selectedLineIds.length === 0
                ? "All lines"
                : `${selectedLineIds.length} line${selectedLineIds.length > 1 ? "s" : ""} selected`}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3" align="start">
            <div className="space-y-2">
              {lines.map((line) => (
                <div key={line.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`line-${line.id}`}
                    checked={selectedLineIds.includes(line.id)}
                    onCheckedChange={(checked) =>
                      handleLineToggle(line.id, checked === true)
                    }
                  />
                  <Label
                    htmlFor={`line-${line.id}`}
                    className="cursor-pointer text-sm font-normal"
                  >
                    {line.name}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button onClick={handleApply} size="sm">
          <Filter className="mr-1.5 size-3.5" />
          Apply
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm">
          <FilterX className="mr-1.5 size-3.5" />
          Reset
        </Button>
      </div>
    </div>
  );
}
