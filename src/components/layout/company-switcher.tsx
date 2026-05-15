"use client";

import { useEffect } from "react";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanies, useCurrencyLookup } from "@/hooks/use-companies";
import { useCompanyStore } from "@/stores/company-store";
import { useAuthStore } from "@/stores/auth-store";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CompanySwitcherProps {
  onOpenChange?: (open: boolean) => void;
}

export function CompanySwitcher({ onOpenChange }: CompanySwitcherProps = {}) {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useCompanies();
  const company = useCompanyStore((s) => s.company);
  const setCompany = useCompanyStore((s) => s.setCompany);

  const selectedCompany = companies?.find((c) => c.name === company);
  const currencyCode = selectedCompany?.default_currency ?? "";

  useCurrencyLookup(currencyCode);

  const { data: currencyMap } = useCurrencyMap();
  const setCurrency = useCompanyStore((s) => s.setCurrency);
  useEffect(() => {
    if (currencyCode && currencyMap) {
      const info = currencyMap.get(currencyCode);
      if (info) {
        setCurrency(info.symbol, info.onRight, currencyCode);
      }
    }
  }, [currencyCode, currencyMap, setCurrency]);

  useEffect(() => {
    if (!companies || companies.length === 0) return;
    const companyNames = companies.map((c) => c.name);

    if (company && companyNames.includes(company)) return;

    const user = useAuthStore.getState().user;
    const saved = user ? localStorage.getItem(`erpnext-company-${user}`) : null;

    if (saved && companyNames.includes(saved)) {
      setCompany(saved);
    } else {
      setCompany(companies[0].name);
    }
  }, [companies, company, setCompany]);

  function handleCompanyChange(value: string) {
    setCompany(value);
    const user = useAuthStore.getState().user;
    if (user) localStorage.setItem(`erpnext-company-${user}`, value);
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  }

  if (isLoading) {
    return <div className="h-7 w-full animate-pulse rounded-md bg-muted/60" />;
  }

  if (!companies || companies.length === 0) {
    return null;
  }

  if (companies.length === 1) {
    return null;
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-full justify-between px-2 text-xs font-medium"
        >
          <span className="flex items-center gap-1.5 min-w-0">
            <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{company || "Company"}</span>
          </span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px]">
        {companies.map((c) => (
          <DropdownMenuItem key={c.name} onClick={() => handleCompanyChange(c.name)}>
            <span className="flex-1 truncate">{c.name}</span>
            {company === c.name && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
