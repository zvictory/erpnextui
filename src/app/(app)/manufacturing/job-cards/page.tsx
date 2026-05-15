"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/shared/data-table";
import { getJobCardColumns } from "@/components/manufacturing/job-cards/job-card-columns";
import { JobCardMobileCard } from "@/components/manufacturing/job-cards/job-card-mobile-card";
import { useJobCardList, useJobCardCount } from "@/hooks/use-manufacturing";
import { useListState } from "@/hooks/use-list-state";
import { useCompanyStore } from "@/stores/company-store";
import type { JobCardListItem } from "@/types/manufacturing";

export default function JobCardsPage() {
  const t = useTranslations("mfg.jobCards");
  const tc = useTranslations("common");
  const router = useRouter();
  const { company } = useCompanyStore();
  const listState = useListState("modified desc");

  const { data: jobCards = [], isLoading } = useJobCardList(
    company,
    listState.page,
    listState.debouncedSearch,
    listState.sort,
  );
  const { data: totalCount = 0 } = useJobCardCount(company, listState.debouncedSearch);

  // Simple mobile detection
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768,
  );
  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const columns = getJobCardColumns(t);

  function navigateTo(jobCard: JobCardListItem) {
    router.push(`/manufacturing/job-cards/${encodeURIComponent(jobCard.name)}`);
  }

  // Pagination info
  const start = (listState.page - 1) * listState.pageSize + 1;
  const end = Math.min(listState.page * listState.pageSize, totalCount);
  const hasNext = listState.page * listState.pageSize < totalCount;
  const hasPrev = listState.page > 1;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {isMobile ? (
        /* ─── Mobile Card Layout ─────────────────────────── */
        <>
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={listState.search}
              onChange={(e) => listState.setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
              ))}
            </div>
          ) : jobCards.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">{tc("noResultsFound")}</div>
          ) : (
            <div className="space-y-3">
              {jobCards.map((jc) => (
                <JobCardMobileCard key={jc.name} jobCard={jc} onClick={() => navigateTo(jc)} />
              ))}
            </div>
          )}

          {/* Mobile pagination */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {totalCount > 0
                ? `${tc("showing")} ${start}-${end} ${tc("of")} ${totalCount}`
                : tc("noResults")}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={listState.prevPage} disabled={!hasPrev}>
                {tc("previous")}
              </Button>
              <Button variant="outline" size="sm" onClick={listState.nextPage} disabled={!hasNext}>
                {tc("next")}
              </Button>
            </div>
          </div>
        </>
      ) : (
        /* ─── Desktop Table Layout ───────────────────────── */
        <DataTable<JobCardListItem>
          columns={columns}
          data={jobCards}
          isLoading={isLoading}
          search={listState.search}
          onSearchChange={listState.setSearch}
          searchPlaceholder={t("search")}
          sort={listState.sort}
          onSortChange={listState.setSort}
          page={listState.page}
          pageSize={listState.pageSize}
          totalCount={totalCount}
          onNextPage={listState.nextPage}
          onPrevPage={listState.prevPage}
          onRowClick={navigateTo}
        />
      )}
    </div>
  );
}
