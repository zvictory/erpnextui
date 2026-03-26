"use client";

import { useTranslations } from "next-intl";
import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/shared/date-input";
import { Badge } from "@/components/ui/badge";
import type { ListFilters } from "@/hooks/use-list-state";

interface StatusOption {
  label: string;
  value: string;
}

interface ListFiltersBarProps {
  filters: ListFilters;
  onFilterChange: (key: string, value: string | undefined) => void;
  onClear: () => void;
  statusOptions?: StatusOption[];
  showDateRange?: boolean;
}

export function ListFiltersBar({
  filters,
  onFilterChange,
  onClear,
  statusOptions,
  showDateRange = false,
}: ListFiltersBarProps) {
  const t = useTranslations("common");
  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        <span>{t("filters")}</span>
        {activeCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
            {activeCount}
          </Badge>
        )}
      </div>

      {statusOptions && (
        <Select
          value={filters.status || "__all__"}
          onValueChange={(v) => onFilterChange("status", v === "__all__" ? undefined : v)}
        >
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder={t("allStatuses")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t("allStatuses")}</SelectItem>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showDateRange && (
        <>
          <div className="w-[150px]">
            <DateInput
              value={filters.dateFrom || ""}
              onChange={(e) => onFilterChange("dateFrom", e.target.value || undefined)}
              placeholder={t("dateFrom")}
            />
          </div>
          <div className="w-[150px]">
            <DateInput
              value={filters.dateTo || ""}
              onChange={(e) => onFilterChange("dateTo", e.target.value || undefined)}
              placeholder={t("dateTo")}
            />
          </div>
        </>
      )}

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onClear}>
          <X className="mr-1 h-3.5 w-3.5" />
          {t("clearFilters")}
        </Button>
      )}
    </div>
  );
}
