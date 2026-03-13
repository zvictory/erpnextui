"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format, lastDayOfMonth, parse } from "date-fns";
import { AlertTriangle, ArrowRightLeft, Search, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkField } from "@/components/shared/link-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useActiveEmployeesWithSalary,
  useSalaryAccrualCheck,
  useAccrueSalary,
} from "@/hooks/use-salary";
import { SalaryAccrualHistory } from "@/components/employees/salary-accrual-history";
import type { SalaryAccrualJE } from "@/hooks/use-salary";
import { useAccountDetail, useCurrencyMap } from "@/hooks/use-accounts";
import { useCompanies } from "@/hooks/use-companies";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useCompanyStore } from "@/stores/company-store";
import { formatCurrency } from "@/lib/formatters";

function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

export default function SalaryAccrualPage() {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");
  const router = useRouter();
  const { company, currencyCode: companyCurrency } = useCompanyStore();
  const { data: currencyMap } = useCurrencyMap();
  const { data: companies = [] } = useCompanies();

  // Resolve company's default currency (fallback to store's currencyCode)
  const companyDoc = companies.find((c) => c.name === company);
  const companyDefaultCurrency = companyDoc?.default_currency ?? companyCurrency;
  const companyInfo = currencyMap?.get(companyDefaultCurrency);
  const companySymbol = companyInfo?.symbol ?? companyDefaultCurrency;
  const companySymbolOnRight = companyInfo?.onRight ?? false;

  const cs = useUISettingsStore((s) => s.getCompanySettings(company));
  const updateSetting = useUISettingsStore((s) => s.updateCompanySetting);
  const salaryPayableAccount = cs.salaryPayableAccount;
  const accountsConfigured = !!salaryPayableAccount;

  // Per-employee expense account state
  const [defaultExpenseAccount, setDefaultExpenseAccount] = useState(cs.salaryExpenseAccount ?? "");
  const [expenseAccounts, setExpenseAccounts] = useState<Map<string, string>>(new Map());
  const [overriddenEmployees, setOverriddenEmployees] = useState<Set<string>>(new Set());

  // Propagate default expense account to non-overridden employees
  useEffect(() => {
    if (!defaultExpenseAccount) return;
    setExpenseAccounts((prev) => {
      const next = new Map(prev);
      for (const [empId] of next) {
        if (!overriddenEmployees.has(empId)) {
          next.set(empId, defaultExpenseAccount);
        }
      }
      return next;
    });
  }, [defaultExpenseAccount, overriddenEmployees]);

  // Use defaultExpenseAccount for currency detection (or first non-empty)
  const expenseAccountForCurrency = defaultExpenseAccount || [...expenseAccounts.values()].find(Boolean) || "";
  const { data: expenseAccountDoc } = useAccountDetail(expenseAccountForCurrency);
  const { data: payableAccountDoc } = useAccountDetail(salaryPayableAccount);

  const currentMonth = format(new Date(), "yyyy-MM");
  const [month, setMonth] = useState(currentMonth);
  const [postingDate, setPostingDate] = useState(() =>
    format(lastDayOfMonth(new Date()), "yyyy-MM-dd"),
  );
  const [search, setSearch] = useState("");
  const [checked, setChecked] = useState<Map<string, boolean>>(new Map());
  const [amounts, setAmounts] = useState<Map<string, number>>(new Map());

  // --- Currency state ---
  const expenseCurrency = expenseAccountDoc?.account_currency ?? "";
  const payableCurrency = payableAccountDoc?.account_currency ?? "";

  // Foreign currency = whichever account differs from company (if any)
  const foreignCurrency =
    expenseCurrency && expenseCurrency !== companyDefaultCurrency
      ? expenseCurrency
      : payableCurrency && payableCurrency !== companyDefaultCurrency
        ? payableCurrency
        : "";

  const isMultiCurrency = !!foreignCurrency;

  // entryCurrency = what user types amounts in (defaults to payable account's currency)
  const [entryCurrency, setEntryCurrency] = useState("");
  useEffect(() => {
    if (payableCurrency && !entryCurrency) {
      setEntryCurrency(payableCurrency);
    }
  }, [payableCurrency, entryCurrency]);

  // --- Exchange rate state (always foreignCurrency → companyCurrency) ---
  const [rateInput, setRateInput] = useState("1");
  const [rateFlipped, setRateFlipped] = useState(false);
  const [rateManuallyEdited, setRateManuallyEdited] = useState(false);

  const { data: fetchedRate } = useExchangeRate(
    foreignCurrency,
    companyDefaultCurrency,
    postingDate,
  );

  useEffect(() => {
    if (fetchedRate && fetchedRate > 0 && !rateManuallyEdited) {
      setRateInput(String(fetchedRate));
      setRateFlipped(false);
    }
  }, [fetchedRate, rateManuallyEdited]);

  useEffect(() => {
    setRateManuallyEdited(false);
  }, [foreignCurrency, companyDefaultCurrency, postingDate]);

  // canonicalRate: always "1 foreignCurrency = X companyDefaultCurrency"
  const canonicalRate = useMemo(() => {
    const v = parseFloat(rateInput) || 1;
    return rateFlipped ? 1 / v : v;
  }, [rateInput, rateFlipped]);

  // Symbol helpers for entry currency
  const entryInfo = currencyMap?.get(entryCurrency);
  const entrySymbol = entryInfo?.symbol ?? entryCurrency;
  const entrySymbolOnRight = entryInfo?.onRight ?? false;

  // Symbol helpers for secondary display (the "other" currency)
  const secondaryCurrency =
    entryCurrency === companyDefaultCurrency ? foreignCurrency : companyDefaultCurrency;
  const secondaryInfo = currencyMap?.get(secondaryCurrency);
  const secondarySymbol = secondaryInfo?.symbol ?? secondaryCurrency;
  const secondarySymbolOnRight = secondaryInfo?.onRight ?? false;

  // Update posting date to last day when month changes
  useEffect(() => {
    if (month) {
      const parsed = parse(month + "-01", "yyyy-MM-dd", new Date());
      setPostingDate(format(lastDayOfMonth(parsed), "yyyy-MM-dd"));
    }
  }, [month]);

  const { data: employees = [] } = useActiveEmployeesWithSalary(company);
  const { data: accrualCheck } = useSalaryAccrualCheck(company, month);
  const accrueSalary = useAccrueSalary();

  // Initialize checked/amounts/expenseAccounts when employees load or month changes
  useEffect(() => {
    if (employees.length > 0) {
      const newChecked = new Map<string, boolean>();
      const newAmounts = new Map<string, number>();
      const newExpAccts = new Map<string, string>();
      for (const emp of employees) {
        newChecked.set(emp.name, false);
        newAmounts.set(emp.name, 0);
        newExpAccts.set(emp.name, defaultExpenseAccount);
      }
      setChecked(newChecked);
      setAmounts(newAmounts);
      setExpenseAccounts(newExpAccts);
      setOverriddenEmployees(new Set());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employees, month]);

  // Client-side filtered employees
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.employee_name.toLowerCase().includes(q) ||
        (e.designation && e.designation.toLowerCase().includes(q)),
    );
  }, [employees, search]);

  const totalAccrual = useMemo(() => {
    let total = 0;
    for (const emp of employees) {
      if (checked.get(emp.name)) {
        total += amounts.get(emp.name) ?? 0;
      }
    }
    return total;
  }, [employees, checked, amounts]);

  // secondaryTotal: the "other" currency equivalent for display
  const secondaryTotal = !isMultiCurrency
    ? 0
    : entryCurrency === companyDefaultCurrency
      ? roundTo2(totalAccrual / canonicalRate) // company→foreign
      : roundTo2(totalAccrual * canonicalRate); // foreign→company

  const checkedCount = useMemo(() => [...checked.values()].filter(Boolean).length, [checked]);

  // Select-all toggles only visible (filtered) employees
  const allVisibleChecked =
    filteredEmployees.length > 0 && filteredEmployees.every((e) => checked.get(e.name));

  const handleSelectAll = (value: boolean) => {
    const next = new Map(checked);
    for (const emp of filteredEmployees) {
      next.set(emp.name, value);
    }
    setChecked(next);
  };

  function handleRateInputChange(value: string) {
    setRateInput(value);
    setRateManuallyEdited(true);
  }

  function handleToggleDirection() {
    setRateInput(String(1 / (parseFloat(rateInput) || 1)));
    setRateFlipped((prev) => !prev);
  }

  function handleRateBlur() {
    if (!isMultiCurrency || totalAccrual <= 0) return;
    const v = parseFloat(rateInput) || 1;
    const currentRate = rateFlipped ? 1 / v : v;
    if (currentRate <= 0) return;

    if (entryCurrency === companyDefaultCurrency) {
      // Entered in company currency → foreign total is derived
      const rounded = roundTo2(totalAccrual / currentRate);
      if (rounded <= 0) return;
      const corrected = totalAccrual / rounded;
      setRateInput(String(rateFlipped ? 1 / corrected : corrected));
    } else {
      // Entered in foreign currency → company total is derived
      const rounded = roundTo2(totalAccrual * currentRate);
      if (rounded <= 0) return;
      const corrected = rounded / totalAccrual;
      setRateInput(String(rateFlipped ? 1 / corrected : corrected));
    }
  }

  const handleSubmit = async () => {
    if (!salaryPayableAccount) {
      toast.error(tSettings("salary.notConfigured"));
      return;
    }

    if (isMultiCurrency && canonicalRate <= 0) {
      toast.error(t("exchangeRate") + " > 0");
      return;
    }

    const selectedEmployees = employees
      .filter((e) => checked.get(e.name))
      .map((e) => ({
        name: e.name,
        employee_name: e.employee_name,
        amount: amounts.get(e.name) ?? 0,
        expenseAccount: expenseAccounts.get(e.name) ?? "",
      }))
      .filter((e) => e.amount > 0);

    if (selectedEmployees.length === 0) return;

    // Validate all selected employees have an expense account
    const missingExpense = selectedEmployees.some((e) => !e.expenseAccount);
    if (missingExpense) {
      toast.error(t("missingExpenseAccount"));
      return;
    }

    // Convert employee amounts from entry currency → payable currency
    const payableEmployees =
      entryCurrency !== payableCurrency
        ? selectedEmployees.map((e) => ({
            ...e,
            amount:
              entryCurrency === companyDefaultCurrency
                ? roundTo2(e.amount / canonicalRate) // company→foreign
                : roundTo2(e.amount * canonicalRate), // foreign→company
          }))
        : selectedEmployees;

    const payableSum = payableEmployees.reduce((s, e) => s + e.amount, 0);

    // Company-currency total
    const companyTotal =
      payableCurrency === companyDefaultCurrency
        ? payableSum
        : roundTo2(payableSum * canonicalRate);

    const payExRate = !isMultiCurrency
      ? 1
      : payableCurrency === companyDefaultCurrency
        ? 1
        : payableSum > 0
          ? companyTotal / payableSum
          : canonicalRate;

    // Build per-expense-account exchange rates & currencies
    // For now, all expense accounts share the same currency (from the default expense account detection)
    const uniqueExpAccounts = new Set(payableEmployees.map((e) => e.expenseAccount));
    const expenseExchangeRates = new Map<string, number>();
    const expenseCurrencies = new Map<string, string>();

    for (const acct of uniqueExpAccounts) {
      // Use the detected expenseCurrency for all expense accounts (they typically share a currency)
      const effExpCurrency = expenseCurrency || companyDefaultCurrency;
      expenseCurrencies.set(acct, effExpCurrency);

      const expExRate = !isMultiCurrency
        ? 1
        : effExpCurrency === companyDefaultCurrency
          ? 1
          : canonicalRate;
      expenseExchangeRates.set(acct, expExRate);
    }

    try {
      await accrueSalary.mutateAsync({
        postingDate,
        month,
        company,
        salaryPayableAccount,
        payableCurrency: payableCurrency || companyDefaultCurrency,
        payableExchangeRate: payExRate,
        expenseExchangeRates,
        expenseCurrencies,
        employees: payableEmployees,
      });
      toast.success(t("salaryAccrued"));
      router.push("/employees");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <FormPageLayout title={t("salaryAccrual")} backHref="/employees" maxWidth="max-w-5xl">
      {/* Controls row */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label>{t("month")}</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label>{t("postingDate")}</Label>
              <Input
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
                className="w-44"
              />
            </div>
            {isMultiCurrency && (
              <div className="space-y-1">
                <Label>{t("currency")}</Label>
                <Select value={entryCurrency} onValueChange={setEntryCurrency}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={foreignCurrency}>
                      {currencyMap?.get(foreignCurrency)?.symbol ?? foreignCurrency}
                    </SelectItem>
                    <SelectItem value={companyDefaultCurrency}>{companySymbol}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {accrualCheck && accrualCheck.accruedEmployees.size > 0 && (
              <Badge variant="destructive" className="gap-1.5 text-sm py-1 px-3">
                <AlertTriangle className="h-3.5 w-3.5" />
                {t("employeesAccrued", {
                  count: accrualCheck.accruedEmployees.size,
                })}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Inline account setup — shown when payable not yet configured */}
      {!accountsConfigured && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Settings className="h-4 w-4" />
              {tSettings("salary.title")}
            </CardTitle>
            <CardDescription className="text-xs">{tSettings("salary.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{tSettings("salary.payableAccount")}</Label>
              <LinkField
                doctype="Account"
                value={salaryPayableAccount}
                onChange={(v) => updateSetting(company, "salaryPayableAccount", v)}
                filters={[
                  ["root_type", "=", "Liability"],
                  ["is_group", "=", 0],
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exchange rate card — only when multi-currency */}
      {isMultiCurrency && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="salaryExchangeRate" className="text-xs">
                  {t("exchangeRate")}
                </Label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    1 {rateFlipped ? companyDefaultCurrency : foreignCurrency} =
                  </span>
                  <Input
                    id="salaryExchangeRate"
                    type="number"
                    step="any"
                    min="0"
                    value={rateInput}
                    onChange={(e) => handleRateInputChange(e.target.value)}
                    onBlur={handleRateBlur}
                    className="h-8 w-32"
                  />
                  <span className="text-xs text-muted-foreground shrink-0">
                    {rateFlipped ? foreignCurrency : companyDefaultCurrency}
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleDirection}
                    aria-label="Toggle rate direction"
                    className={cn(
                      "flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors",
                      "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <ArrowRightLeft className="size-3" />
                  </button>
                </div>
              </div>
              {totalAccrual > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("effectiveTotal")}</Label>
                  <div className="text-sm font-medium tabular-nums">
                    {formatCurrency(secondaryTotal, secondarySymbol, secondarySymbolOnRight)}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default expense account */}
      <div className="space-y-1.5 max-w-sm">
        <Label>{t("defaultExpenseAccount")}</Label>
        <LinkField
          doctype="Account"
          value={defaultExpenseAccount}
          onChange={setDefaultExpenseAccount}
          filters={[
            ["root_type", "=", "Expense"],
            ["is_group", "=", 0],
          ]}
        />
      </div>

      {/* Accrual history */}
      {accrualCheck && accrualCheck.accrualJEs.length > 0 && (
        <SalaryAccrualHistory
          entries={accrualCheck.accrualJEs}
          currencySymbol={entrySymbol}
          symbolOnRight={entrySymbolOnRight}
          onAmend={(je: SalaryAccrualJE) => {
            // Pre-fill employee table with data from the amended JE
            const newChecked = new Map<string, boolean>();
            const newAmounts = new Map<string, number>();
            for (const emp of employees) {
              const match = je.employees.find((e) => e.party === emp.name);
              newChecked.set(emp.name, !!match);
              newAmounts.set(emp.name, match?.amount ?? 0);
            }
            setChecked(newChecked);
            setAmounts(newAmounts);
          }}
        />
      )}

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("searchEmployees")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Employee table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleChecked}
                  onCheckedChange={(v) => handleSelectAll(v === true)}
                />
              </TableHead>
              <TableHead>{t("employeeName")}</TableHead>
              <TableHead>{t("designation")}</TableHead>
              <TableHead className="w-60">{t("expenseAccount")}</TableHead>
              <TableHead className="text-right w-48">{t("advanceAmount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((emp) => {
              const isChecked = checked.get(emp.name) ?? false;
              const empAccrual = accrualCheck?.accruedEmployees.get(emp.name);
              return (
                <TableRow key={emp.name}>
                  <TableCell>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(v) =>
                        setChecked(new Map(checked).set(emp.name, v === true))
                      }
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <span>{emp.employee_name}</span>
                    {empAccrual && (
                      <Badge
                        variant="outline"
                        className="ml-2 text-[10px] px-1.5 py-0 text-amber-600 border-amber-300"
                      >
                        {t("accrued")} · {empAccrual.jeName}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{emp.designation}</TableCell>
                  <TableCell>
                    <LinkField
                      doctype="Account"
                      value={expenseAccounts.get(emp.name) ?? ""}
                      onChange={(v) => {
                        setExpenseAccounts(new Map(expenseAccounts).set(emp.name, v));
                        setOverriddenEmployees(new Set(overriddenEmployees).add(emp.name));
                      }}
                      filters={[
                        ["root_type", "=", "Expense"],
                        ["is_group", "=", 0],
                      ]}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="w-40 text-right ml-auto"
                      value={amounts.get(emp.name) ?? 0}
                      onChange={(e) =>
                        setAmounts(new Map(amounts).set(emp.name, parseFloat(e.target.value) || 0))
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  {search ? tCommon("noResults") : tCommon("loading")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 bg-background border-t py-3 -mx-1 px-1 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">{t("totalAccrual")}:</span>{" "}
          <span className="font-bold tabular-nums">
            {formatCurrency(totalAccrual, entrySymbol, entrySymbolOnRight)}
          </span>
          {isMultiCurrency && totalAccrual > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              {"\u2248 "}
              {formatCurrency(secondaryTotal, secondarySymbol, secondarySymbolOnRight)}
            </span>
          )}
          <span className="text-xs text-muted-foreground ml-2">
            ({checkedCount} {t("employee").toLowerCase()})
          </span>
        </div>
        <Button onClick={handleSubmit} disabled={accrueSalary.isPending || checkedCount === 0}>
          {accrueSalary.isPending ? tCommon("loading") : t("accrueAndSubmit")}
        </Button>
      </div>
    </FormPageLayout>
  );
}
