"use client";

import { useTranslations } from "next-intl";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PriceListListItem } from "@/types/price-list";

export type TypeFilter = "all" | "selling" | "buying";

interface PriceListPanelProps {
  priceLists: PriceListListItem[];
  isLoading: boolean;
  search: string;
  onSearchChange: (val: string) => void;
  selectedName: string | null;
  onSelect: (pl: PriceListListItem) => void;
  page: number;
  totalCount: number;
  pageSize: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  canCreate: boolean;
  onNew: () => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (type: TypeFilter) => void;
}

export function PriceListPanel({
  priceLists,
  isLoading,
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
  typeFilter,
  onTypeFilterChange,
}: PriceListPanelProps) {
  const t = useTranslations("priceLists");
  const tCommon = useTranslations("common");

  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;
  const hasNext = end < totalCount;

  const filters: { key: TypeFilter; label: string }[] = [
    { key: "all", label: t("all") },
    { key: "selling", label: t("selling") },
    { key: "buying", label: t("buying") },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-base">{t("title")}</span>
        {canCreate && (
          <Button size="sm" variant="outline" onClick={onNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            {tCommon("new")}
          </Button>
        )}
      </div>

      {/* Type filter tabs */}
      <div className="flex gap-1 px-3 py-2 border-b">
        {filters.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={typeFilter === f.key ? "default" : "ghost"}
            className="h-7 text-xs px-3"
            onClick={() => onTypeFilterChange(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder={t("searchPriceLists")}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      {/* Price list rows */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : priceLists.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
            {t("noPriceLists")}
          </div>
        ) : (
          <div>
            {priceLists.map((pl) => {
              const isSelected = pl.name === selectedName;
              return (
                <button
                  key={pl.name}
                  type="button"
                  onClick={() => onSelect(pl)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    "hover:bg-accent/50",
                    isSelected && "bg-accent",
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate leading-tight">
                        {pl.price_list_name}
                      </span>
                      {!pl.enabled && (
                        <Badge
                          variant="secondary"
                          className="text-[9px] h-3.5 px-1 shrink-0 text-red-600"
                        >
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">{pl.currency}</span>
                      {!!pl.selling && (
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                          {t("selling")}
                        </Badge>
                      )}
                      {!!pl.buying && (
                        <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                          {t("buying")}
                        </Badge>
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
            {start}–{end} {tCommon("of")} {totalCount}
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
