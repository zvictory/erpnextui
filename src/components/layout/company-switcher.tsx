"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanies, useCurrencyLookup } from "@/hooks/use-companies";
import { useCompanyStore } from "@/stores/company-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CompanySwitcher() {
  const queryClient = useQueryClient();
  const { data: companies, isLoading } = useCompanies();
  const company = useCompanyStore((s) => s.company);
  const setCompany = useCompanyStore((s) => s.setCompany);

  // Find the selected company to get its currency
  const selectedCompany = companies?.find((c) => c.name === company);
  const currencyCode = selectedCompany?.default_currency ?? "";

  // Fetch currency details whenever the selected company's currency changes
  useCurrencyLookup(currencyCode);

  // Auto-select first company if none is saved or saved company not in list
  useEffect(() => {
    if (!companies || companies.length === 0) return;
    const companyNames = companies.map((c) => c.name);
    if (!company || !companyNames.includes(company)) {
      setCompany(companies[0].name);
    }
  }, [companies, company, setCompany]);

  function handleCompanyChange(value: string) {
    setCompany(value);
    // Invalidate all company-dependent queries
    queryClient.invalidateQueries({ queryKey: ["accounts"] });
    queryClient.invalidateQueries({ queryKey: ["journalEntries"] });
  }

  if (isLoading) {
    return (
      <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
    );
  }

  if (!companies || companies.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No companies found</p>
    );
  }

  return (
    <Select value={company} onValueChange={handleCompanyChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((c) => (
          <SelectItem key={c.name} value={c.name}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
