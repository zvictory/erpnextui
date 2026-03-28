"use client";

import { useTranslations } from "next-intl";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatInvoiceCurrency, formatCurrency } from "@/lib/formatters";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";
import { getInitials } from "@/components/shared/party-detail-panel";
import type { CurrencyBalance } from "@/types/party-report";

interface PartyRow {
  name: string;
  displayName: string;
  outstanding_balance: number | null;
  currency_balances: CurrencyBalance[];
  currency?: string;
}

interface PartyListPanelProps {
  partyType: "Customer" | "Supplier";
  parties: PartyRow[];
  isLoading: boolean;
  balancesLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  selectedName: string | null;
  onSelect: (party: PartyRow) => void;
  page: number;
  totalCount: number;
  pageSize: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  canCreate: boolean;
  onNew: () => void;
}

function BalanceDisplay({
  balances,
  outstandingBalance,
  currencyMap,
}: {
  balances: CurrencyBalance[];
  outstandingBalance: number | null;
  currencyMap: Map<string, { symbol: string; onRight: boolean }> | undefined;
}) {
  const { currencySymbol, symbolOnRight } = useCompanyStore();

  if (balances.length === 0) {
    if (outstandingBalance != null && Math.abs(outstandingBalance) >= 0.005) {
      return (
        <span
          className={cn(
            "tabular-nums leading-tight",
            outstandingBalance > 0
              ? "text-red-600"
              : outstandingBalance < 0
                ? "text-green-600"
                : "text-muted-foreground",
          )}
        >
          {formatCurrency(Math.abs(outstandingBalance), currencySymbol, symbolOnRight)}
        </span>
      );
    }
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
              "tabular-nums leading-tight",
              b.amount > 0
                ? "text-red-600"
                : b.amount < 0
                  ? "text-green-600"
                  : "text-muted-foreground",
            )}
          >
            {formatInvoiceCurrency(Math.abs(b.amount), b.currency, info)}
          </span>
        );
      })}
    </div>
  );
}

export function PartyListPanel({
  partyType,
  parties,
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
  canCreate,
  onNew,
}: PartyListPanelProps) {
  const t = useTranslations("common");
  const tCustomers = useTranslations("customers");
  const tVendors = useTranslations("vendors");
  const { data: currencyMap } = useCurrencyMap();
  const title = partyType === "Customer" ? tCustomers("title") : tVendors("title");
  const placeholder =
    partyType === "Customer" ? tCustomers("searchCustomers") : tVendors("searchVendors");

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;
  const hasNext = end < totalCount;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-base">{title}</span>
        {canCreate && (
          <Button size="sm" variant="outline" onClick={onNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("new")}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder={placeholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Party rows */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : parties.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {partyType === "Customer" ? tCustomers("noCustomers") : tVendors("noVendors")}
          </div>
        ) : (
          <div>
            {parties.map((party) => {
              const isSelected = party.name === selectedName;
              const balances = party.currency_balances;

              return (
                <button
                  key={party.name}
                  type="button"
                  onClick={() => onSelect(party)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/50",
                    isSelected && "bg-accent",
                  )}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-xs font-medium",
                        party.currency === "USD"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                          : party.currency === "UZS"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                            : party.currency === "EUR"
                              ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                              : party.currency === "RUB"
                                ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                                : "bg-muted text-muted-foreground",
                      )}
                    >
                      {party.currency ? party.currency.slice(0, 3) : getInitials(party.displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate leading-tight">
                      {party.displayName}
                    </div>
                    <div className="text-xs mt-0.5">
                      {balancesLoading ? (
                        <Skeleton className="h-3 w-20 mt-1" />
                      ) : (
                        <BalanceDisplay
                          balances={balances}
                          outstandingBalance={party.outstanding_balance}
                          currencyMap={currencyMap}
                        />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Pagination */}
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
