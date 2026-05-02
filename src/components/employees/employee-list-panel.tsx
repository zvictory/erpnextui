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

const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = ((hash * 31) + c.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface EmployeeRow {
  name: string;
  employee_name: string;
  designation: string;
  outstanding_balance: number;
  currency_balances: CurrencyBalance[];
  custom_hourly_cost?: number;
  custom_cost_classification?: "Direct Labor" | "Period Cost";
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
    return <span className="text-muted-foreground/40">—</span>;
  }

  return (
    <div className="flex flex-col items-end">
      {balances.map((b) => {
        const info = currencyMap?.get(b.currency);
        return (
          <span
            key={b.currency}
            className={cn(
              "tabular-nums leading-tight whitespace-nowrap font-medium",
              b.amount > 0
                ? "text-red-600 dark:text-red-400"
                : b.amount < 0
                  ? "text-emerald-600 dark:text-emerald-400"
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
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-8 h-8 text-sm bg-muted/40 border-0 focus-visible:ring-1"
            placeholder={t("searchEmployees")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs text-muted-foreground shrink-0 px-2"
          onClick={toggleSort}
          title={sortBy === "name" ? t("sortByName") : t("sortByBalance")}
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-px pt-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-3.5 w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : employees.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {t("noEmployees")}
          </div>
        ) : (
          <div className="pt-0.5">
            {employees.map((emp) => {
              const isSelected = emp.name === selectedName;
              const color = avatarColor(emp.name);
              return (
                <button
                  key={emp.name}
                  type="button"
                  onClick={() => onSelect(emp)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "border-l-2",
                    isSelected
                      ? "bg-accent border-primary"
                      : "border-transparent hover:bg-accent/40 hover:border-border",
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold",
                      color,
                    )}
                  >
                    {getInitials(emp.employee_name)}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn(
                        "text-sm font-medium truncate leading-tight",
                        isSelected ? "text-foreground" : "",
                      )}
                    >
                      {emp.employee_name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {emp.designation ? (
                        <span className="text-[11px] text-muted-foreground truncate">
                          {emp.designation}
                        </span>
                      ) : null}
                      {emp.custom_hourly_cost ? (
                        <span className="text-[10px] text-muted-foreground/70">
                          · {formatNumber(emp.custom_hourly_cost, 0)}/hr
                          {emp.custom_cost_classification === "Direct Labor" && (
                            <span className="ml-0.5 text-blue-500 dark:text-blue-400 font-medium">
                              DL
                            </span>
                          )}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="text-xs text-right flex-shrink-0">
                    {balancesLoading ? (
                      <Skeleton className="h-3.5 w-16" />
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

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t text-xs text-muted-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!hasPrev}
            onClick={onPrevPage}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="tabular-nums">
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
