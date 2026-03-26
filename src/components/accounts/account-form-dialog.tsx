"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getToday } from "@/lib/utils";
import {
  useGroupAccounts,
  useCurrencies,
  useEquityAccounts,
  useCreateAccount,
  useUpdateAccount,
  useAccountDetail,
  useCreateOpeningBalanceJE,
} from "@/hooks/use-accounts";
import { useCompanyStore } from "@/stores/company-store";

const ACCOUNT_TYPES = [
  "Bank",
  "Cash",
  "Receivable",
  "Payable",
  "Equity",
  "Income Account",
  "Expense Account",
  "Cost of Goods Sold",
  "Fixed Asset",
  "Liability",
  "Temporary",
];

interface AccountFormDialogProps {
  mode: "bank" | "general";
  /** Name of the account to edit. Omit for create mode. */
  editName?: string;
  /** Pre-select parent account for "Add Child" flow. */
  defaultParent?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AccountFormDialog({
  mode,
  editName,
  defaultParent,
  open,
  onOpenChange,
}: AccountFormDialogProps) {
  const t = useTranslations("accounts");
  const { company, currencyCode: companyCurrency } = useCompanyStore();
  const { data: groupAccounts = [] } = useGroupAccounts(company);
  const { data: currencies = [] } = useCurrencies();
  const { data: equityAccounts = [] } = useEquityAccounts(company);
  const { data: account, isLoading: accountLoading } = useAccountDetail(editName);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const createOBJE = useCreateOpeningBalanceJE();

  const [accountName, setAccountName] = useState("");
  const [parentAccount, setParentAccount] = useState("");
  const [currency, setCurrency] = useState("");
  const [accountType, setAccountType] = useState("Expense Account");
  const [isGroup, setIsGroup] = useState(false);
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [equityAccount, setEquityAccount] = useState("");
  const [error, setError] = useState("");

  const isEdit = !!editName;
  const showOpeningBalance = !isEdit && !isGroup;
  const isPending = createAccount.isPending || updateAccount.isPending || createOBJE.isPending;

  // Populate form when fetched account data arrives
  useEffect(() => {
    if (account) {
      setAccountName(account.account_name);
      setParentAccount(account.parent_account ?? "");
      setCurrency(account.account_currency);
      setAccountType(account.account_type);
      setIsGroup(account.is_group === 1);
      setBankAccountNo(account.bank_account_no ?? "");
    }
  }, [account]);

  // Reset form when dialog closes, or pre-fill parent when opening
  useEffect(() => {
    if (!open) {
      setAccountName("");
      setParentAccount("");
      setCurrency("");
      setAccountType("Expense Account");
      setIsGroup(false);
      setBankAccountNo("");
      setOpeningAmount("");
      setEquityAccount("");
      setError("");
    } else if (defaultParent && !editName) {
      setParentAccount(defaultParent);
    }
  }, [open, defaultParent, editName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!accountName.trim()) {
      setError("Account name is required");
      return;
    }
    if (!parentAccount) {
      setError("Parent account is required");
      return;
    }
    if (!currency) {
      setError("Currency is required");
      return;
    }
    if (mode === "general" && !accountType) {
      setError("Account type is required");
      return;
    }

    const baseData = {
      account_name: accountName.trim(),
      parent_account: parentAccount,
      account_currency: currency,
    };

    const parsedOB = parseFloat(openingAmount);
    const hasOpeningBalance = showOpeningBalance && parsedOB > 0;

    if (hasOpeningBalance && !equityAccount) {
      setError("Equity account is required when setting an opening balance");
      return;
    }

    try {
      if (isEdit) {
        const updates =
          mode === "bank"
            ? { ...baseData, bank_account_no: bankAccountNo }
            : { ...baseData, account_type: accountType, is_group: isGroup };
        await updateAccount.mutateAsync({ name: editName!, data: updates });
        toast.success("Account updated");
      } else {
        const data =
          mode === "bank"
            ? { ...baseData, bank_account_no: bankAccountNo }
            : { ...baseData, account_type: accountType, is_group: isGroup };
        const created = await createAccount.mutateAsync({ data, mode, company });

        if (hasOpeningBalance) {
          try {
            const je = await createOBJE.mutateAsync({
              targetAccount: created.name,
              account: {
                root_type: created.root_type,
                account_currency: created.account_currency,
              },
              equityAccount,
              amount: parsedOB,
              date: getToday(),
              exchangeRate: currency !== companyCurrency ? 1 : 1,
              company,
              companyCurrency,
            });
            toast.success(`Account created with opening balance — JE: ${je.name}`);
          } catch {
            toast.warning("Account created, but opening balance JE failed");
          }
        } else {
          toast.success("Account created");
        }
      }
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account");
    }
  }

  const selectClass = cn(
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none",
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t("edit") : t("new")} {mode === "bank" ? t("bankAccount") : t("account")}
          </DialogTitle>
        </DialogHeader>

        {isEdit && accountLoading ? (
          <div className="space-y-4 py-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="account_name">{t("accountName")} *</Label>
              <Input
                id="account_name"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={t("accountNamePlaceholder")}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parent_account">{t("parentAccount")} *</Label>
              <select
                id="parent_account"
                value={parentAccount}
                onChange={(e) => setParentAccount(e.target.value)}
                className={cn(selectClass, !parentAccount && "text-muted-foreground")}
              >
                <option value="">{t("selectParentAccount")}</option>
                {groupAccounts.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.account_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="currency">{t("currency")} *</Label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={cn(selectClass, !currency && "text-muted-foreground")}
              >
                <option value="">{t("selectCurrency")}</option>
                {currencies.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {mode === "general" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="account_type">{t("accountType")} *</Label>
                  <select
                    id="account_type"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className={selectClass}
                  >
                    {ACCOUNT_TYPES.map((at) => (
                      <option key={at} value={at}>
                        {at}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isGroup}
                    onChange={(e) => setIsGroup(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {t("isGroupLabel")}
                </label>
              </>
            )}

            {mode === "bank" && (
              <div className="space-y-1.5">
                <Label htmlFor="bank_account_no">{t("bankAccountNo")}</Label>
                <Input
                  id="bank_account_no"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  placeholder={t("bankAccountNoPlaceholder")}
                />
              </div>
            )}

            {showOpeningBalance && (
              <div className="space-y-3 rounded-md border border-dashed p-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("openingBalance")}
                </Label>
                <div className="space-y-1.5">
                  <Label htmlFor="opening_amount">
                    {t("amount")} {currency ? `(${currency})` : ""}
                  </Label>
                  <Input
                    id="opening_amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {parseFloat(openingAmount) > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="equity_account">{t("equityAccount")} *</Label>
                    <select
                      id="equity_account"
                      value={equityAccount}
                      onChange={(e) => setEquityAccount(e.target.value)}
                      className={cn(selectClass, !equityAccount && "text-muted-foreground")}
                    >
                      <option value="">{t("selectEquityAccount")}</option>
                      {equityAccounts.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.account_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("saving") : isEdit ? t("update") : t("create")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
