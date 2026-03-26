"use client";

import { useTranslations } from "next-intl";
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";

import type { CurrencyBalance } from "@/types/party-report";
import type { EmployeeSortBy } from "@/app/(app)/employees/page";

interface EmployeeRow {
  name: string;
  employee_name: string;
  designation: string;
  outstanding_balance: number;
  currency_balances: CurrencyBalance[];
}

interface EmployeeListPanelProps {
  employees: EmployeeRow[];
  isLoading: boolean;
  balancesLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  selectedName: string | null;
  onSelect: (employee: EmployeeRow) => void;
  page: number;
  totalCount: number;
  pageSize: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  sortBy: EmployeeSortBy;
  onSortChange: (sort: EmployeeSortBy) => void;
}

function BalanceDisplay({
  balances,
  currencyMap,
}: {
  balances: CurrencyBalance[];
  currencyMap: Map<string, { symbol: string; onRight: boolean }> | undefined;
}) {
  if (balances.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-col">
      {balances.map((b) => {
        const info = currencyMap?.get(b.currency);
        return (
          <span
            key={b.currency}
            className={cn(
              "tabular-nums leading-tight whitespace-nowrap",
              b.amount > 0
                ? "text-red-600"
                : b.amount < 0
                  ? "text-green-600"
                  : "text-muted-foreground",
            )}
          >
            {(() => {
              const formatted = formatNumber(Math.abs(b.amount), 0);
              const symbol = info?.symbol ?? b.currency;
              return info?.onRight ? `${formatted} ${symbol}` : `${symbol} ${formatted}`;
            })()}
          </span>
        );
      })}
    </div>
  );
}

export function EmployeeListPanel({
  employees,
  isLoading,
  balancesLoading,
  search,
  onSearchChange,
  selectedName,
  onSelect,
  page,
  totalCount,
  pageSize,
  onNextPage,
  onPrevPage,
  sortBy,
  onSortChange,
}: EmployeeListPanelProps) {
  const t = useTranslations("employees");
  const { data: currencyMap } = useCurrencyMap();

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;
  const hasNext = end < totalCount;

  const toggleSort = () => {
    onSortChange(sortBy === "name" ? "balance" : "name");
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-base">{t("title")}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs text-muted-foreground"
          onClick={toggleSort}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {sortBy === "name" ? t("sortByName") : t("sortByBalance")}
        </Button>
      </div>

      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder={t("searchEmployees")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-3.5 flex-1" />
                <Skeleton className="h-3 w-16 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {t("noEmployees")}
          </div>
        ) : (
          <div>
            {employees.map((emp) => {
              const isSelected = emp.name === selectedName;
              return (
                <button
                  key={emp.name}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors",
                    "hover:bg-accent/50 even:bg-muted/40",
                    isSelected && "bg-accent",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{emp.employee_name}</div>
                  </div>
                  <div className="text-xs text-right flex-shrink-0">
                    {balancesLoading ? (
                      <Skeleton className="h-3 w-16" />
                    ) : (
                      <BalanceDisplay balances={emp.currency_balances} currencyMap={currencyMap} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {totalCount > 0 && (
        <div className="flex items-center justify-between px-3 py-2 border-t text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!hasPrev}
            onClick={onPrevPage}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span>
            {start}–{end} of {totalCount}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!hasNext}
            onClick={onNextPage}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
