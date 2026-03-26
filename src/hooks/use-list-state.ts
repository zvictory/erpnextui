"use client";

import { useState, useCallback, useEffect, useRef } from "react";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

export interface ListFilters {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: string | undefined;
}

interface ListState {
  page: number;
  search: string;
  debouncedSearch: string;
  sort: string;
  pageSize: number;
  filters: ListFilters;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setSort: (sort: string) => void;
  setFilter: (key: string, value: string | undefined) => void;
  clearFilters: () => void;
  nextPage: () => void;
  prevPage: () => void;
}

export function useListState(defaultSort: string): ListState {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState(defaultSort);
  const [filters, setFilters] = useState<ListFilters>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(() => setPage((p) => Math.max(1, p - 1)), []);

  const setFilter = useCallback((key: string, value: string | undefined) => {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === "") {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setPage(1);
  }, []);

  return {
    page,
    search,
    debouncedSearch,
    sort,
    pageSize: PAGE_SIZE,
    filters,
    setPage,
    setSearch,
    setSort,
    setFilter,
    clearFilters,
    nextPage,
    prevPage,
  };
}
