"use client";

import { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkField } from "@/components/shared/link-field";
import { InvoiceItemsEditor } from "@/components/shared/invoice-items-editor";
import { Settings } from "lucide-react";
import { useCreateIceCreamSale } from "@/hooks/use-journal-entries";
import { useSellingPriceList } from "@/hooks/use-selling-price-list";
import { useCurrencyMap } from "@/hooks/use-accounts";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useCompanyStore } from "@/stores/company-store";

export interface IceCreamFormValues {
  posting_date: string;
  items: {
    item_code: string;
    qty: number;
    rate: number;
    amount: number;
    uom: string;
    discount_percentage: number;
    discount_amount: number;
  }[];
}

interface IceCreamSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: string;
  employeeName: string;
  company: string;
  onSuccess?: () => void;
  defaultValues?: IceCreamFormValues;
}

export function IceCreamSaleDialog({
  open,
  onOpenChange,
  employee,
  employeeName,
  company,
  onSuccess,
  defaultValues: externalDefaults,
}: IceCreamSaleDialogProps) {
  const t = useTranslations("employees");
  const tCommon = useTranslations("common");
  const tSettings = useTranslations("settings");

  const createSale = useCreateIceCreamSale();
  const { data: sellingPriceList } = useSellingPriceList(company);
  const { data: currencyMap } = useCurrencyMap();

  const cs = useUISettingsStore((s) => s.getCompanySettings(company));
  const updateSetting = useUISettingsStore((s) => s.updateCompanySetting);
  const debitAccount = cs.iceCreamDebitAccount;
  const creditAccount = cs.iceCreamCreditAccount;
  const iceCreamCurrency = cs.iceCreamCurrency;
  const iceCreamCustomer = cs.iceCreamCustomer;
  const iceCreamCustomerARAccount = cs.iceCreamCustomerARAccount;
  const accountsConfigured =
    !!debitAccount && !!creditAccount && !!iceCreamCustomer && !!iceCreamCustomerARAccount;
  const companyCurrency = useCompanyStore((s) => s.currencyCode);

  const methods = useForm<IceCreamFormValues>({
    defaultValues: {
      posting_date: format(new Date(), "yyyy-MM-dd"),
      items: [
        {
          item_code: "",
          qty: 1,
          rate: 0,
          amount: 0,
          uom: "",
          discount_percentage: 0,
          discount_amount: 0,
        },
      ],
    },
  });

  const { watch, setValue, reset } = methods;

  const postingDate = watch("posting_date");

  const isMultiCurrency =
    !!iceCreamCurrency && !!companyCurrency && iceCreamCurrency !== companyCurrency;

  const { data: exchangeRate } = useExchangeRate(iceCreamCurrency, companyCurrency, postingDate);

  const currencyInfo =
    iceCreamCurrency && currencyMap ? currencyMap.get(iceCreamCurrency) : undefined;

  useEffect(() => {
    if (open) {
      if (externalDefaults) {
        reset(externalDefaults);
      } else {
        reset({
          posting_date: format(new Date(), "yyyy-MM-dd"),
          items: [
            {
              item_code: "",
              qty: 1,
              rate: 0,
              amount: 0,
              uom: "",
              discount_percentage: 0,
              discount_amount: 0,
            },
          ],
        });
      }
    }
  }, [open, reset, externalDefaults]);

  const handleSubmit = async () => {
    if (!debitAccount || !creditAccount || !iceCreamCustomer || !iceCreamCustomerARAccount) {
      toast.error(tSettings("iceCreamSale.notConfigured"));
      return;
    }

    const values = methods.getValues();

    const validItems = values.items.filter((item) => item.item_code && item.amount > 0);
    if (validItems.length === 0) return;

    const remarkItems = validItems.map((item) => `${item.item_code} x${item.qty}`).join(", ");
    const userRemark = `Ice cream: ${remarkItems}`;

    const rate = isMultiCurrency ? (exchangeRate ?? 1) : 1;
    const currency = iceCreamCurrency || companyCurrency || "USD";

    try {
      await createSale.mutateAsync({
        postingDate: values.posting_date,
        company,
        employee,
        customer: iceCreamCustomer,
        customerARAccount: iceCreamCustomerARAccount,
        employeeAccount: debitAccount,
        incomeAccount: creditAccount,
        currency,
        exchangeRate: rate,
        multiCurrency: isMultiCurrency,
        userRemark,
        items: validItems.map((i) => ({
          item_code: i.item_code,
          qty: i.qty,
          rate: i.rate,
          amount: i.amount,
          uom: i.uom || undefined,
        })),
      });
      toast.success(t("saleSubmitted"));
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saleError"));
    }
  };

  const isPending = createSale.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("iceCreamSale")}</DialogTitle>
          <DialogDescription>
            {t("iceCreamDescription")}
            {" — "}
            <span className="font-medium text-foreground">{employeeName}</span>
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...methods}>
          <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
            {!accountsConfigured && (
              <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Settings className="h-4 w-4" />
                    {tSettings("iceCreamSale.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {tSettings("iceCreamSale.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tSettings("iceCreamSale.employeeAccount")}</Label>
                    <LinkField
                      doctype="Account"
                      value={debitAccount}
                      onChange={(v) => updateSetting(company, "iceCreamDebitAccount", v)}
                      filters={[
                        ["parent_account", "like", "%Loans and Advances%"],
                        ["is_group", "=", 0],
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tSettings("iceCreamSale.revenueAccount")}</Label>
                    <LinkField
                      doctype="Account"
                      value={creditAccount}
                      onChange={(v) => updateSetting(company, "iceCreamCreditAccount", v)}
                      filters={[
                        ["root_type", "=", "Income"],
                        ["is_group", "=", 0],
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tSettings("iceCreamSale.currency")}</Label>
                    <LinkField
                      doctype="Currency"
                      value={iceCreamCurrency}
                      onChange={(v) => updateSetting(company, "iceCreamCurrency", v)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{tSettings("iceCreamSale.customer")}</Label>
                    <LinkField
                      doctype="Customer"
                      value={iceCreamCustomer}
                      onChange={(v) => updateSetting(company, "iceCreamCustomer", v)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">{tSettings("iceCreamSale.customerARAccount")}</Label>
                    <LinkField
                      doctype="Account"
                      value={iceCreamCustomerARAccount}
                      onChange={(v) => updateSetting(company, "iceCreamCustomerARAccount", v)}
                      filters={[
                        ["root_type", "=", "Asset"],
                        ["is_group", "=", 0],
                      ]}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-3">
              <Label className="shrink-0">{t("date")}</Label>
              <Input
                type="date"
                className="w-44"
                value={watch("posting_date")}
                onChange={(e) => setValue("posting_date", e.target.value)}
              />
            </div>

            <InvoiceItemsEditor
              priceList={sellingPriceList ?? ""}
              currencySymbol={currencyInfo?.symbol}
              symbolOnRight={currencyInfo?.onRight}
            />

            <div className="flex justify-end pt-1">
              <Button disabled={isPending} onClick={handleSubmit}>
                {isPending ? tCommon("loading") : t("saveAndSubmit")}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
