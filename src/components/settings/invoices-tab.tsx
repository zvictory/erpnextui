"use client";

import { useTranslations } from "next-intl";
import { useUISettingsStore } from "@/stores/ui-settings-store";
import { useCompanyStore } from "@/stores/company-store";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkField } from "@/components/shared/link-field";

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="flex flex-col gap-1">
        <span>{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground font-normal">{description}</span>
        )}
      </Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function InvoicesTab() {
  const t = useTranslations("settings");
  const company = useCompanyStore((s) => s.company);

  const showUom = useUISettingsStore((s) => s.invoiceShowUom);
  const showDiscPct = useUISettingsStore((s) => s.invoiceShowDiscountPercent);
  const showDiscAmt = useUISettingsStore((s) => s.invoiceShowDiscountAmount);
  const setShowUom = useUISettingsStore((s) => s.setInvoiceShowUom);
  const setShowDiscPct = useUISettingsStore((s) => s.setInvoiceShowDiscountPercent);
  const setShowDiscAmt = useUISettingsStore((s) => s.setInvoiceShowDiscountAmount);

  const cs = useUISettingsStore((s) => s.getCompanySettings(company));
  const update = useUISettingsStore((s) => s.updateCompanySetting);

  const salaryPayable = cs.salaryPayableAccount;
  const icDebit = cs.iceCreamDebitAccount;
  const icCredit = cs.iceCreamCreditAccount;
  const icCurrency = cs.iceCreamCurrency;
  const icCustomer = cs.iceCreamCustomer;
  const icCustomerAR = cs.iceCreamCustomerARAccount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("invoiceColumns.title")}</CardTitle>
          <CardDescription>{t("invoiceColumns.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ToggleRow
            label={t("invoiceColumns.uom")}
            description={t("invoiceColumns.uomDesc")}
            checked={showUom}
            onChange={setShowUom}
          />
          <ToggleRow
            label={t("invoiceColumns.discountPercent")}
            description={t("invoiceColumns.discountPercentDesc")}
            checked={showDiscPct}
            onChange={setShowDiscPct}
          />
          <ToggleRow
            label={t("invoiceColumns.discountAmount")}
            description={t("invoiceColumns.discountAmountDesc")}
            checked={showDiscAmt}
            onChange={setShowDiscAmt}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("iceCreamSale.title")}</CardTitle>
          <CardDescription>{t("iceCreamSale.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("iceCreamSale.employeeAccount")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("iceCreamSale.employeeAccountDesc")}
              </span>
            </Label>
            <LinkField
              doctype="Account"
              value={icDebit}
              onChange={(v) => update(company, "iceCreamDebitAccount", v)}
              filters={[
                ["parent_account", "like", "%Loans and Advances%"],
                ["is_group", "=", 0],
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("iceCreamSale.revenueAccount")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("iceCreamSale.revenueAccountDesc")}
              </span>
            </Label>
            <LinkField
              doctype="Account"
              value={icCredit}
              onChange={(v) => update(company, "iceCreamCreditAccount", v)}
              filters={[
                ["root_type", "=", "Income"],
                ["is_group", "=", 0],
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("iceCreamSale.currency")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("iceCreamSale.currencyDesc")}
              </span>
            </Label>
            <LinkField
              doctype="Currency"
              value={icCurrency}
              onChange={(v) => update(company, "iceCreamCurrency", v)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("iceCreamSale.customer")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("iceCreamSale.customerDesc")}
              </span>
            </Label>
            <LinkField
              doctype="Customer"
              value={icCustomer}
              onChange={(v) => update(company, "iceCreamCustomer", v)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("iceCreamSale.customerARAccount")}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t("iceCreamSale.customerARAccountDesc")}
              </span>
            </Label>
            <LinkField
              doctype="Account"
              value={icCustomerAR}
              onChange={(v) => update(company, "iceCreamCustomerARAccount", v)}
              filters={[
                ["root_type", "=", "Asset"],
                ["is_group", "=", 0],
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("salary.title")}</CardTitle>
          <CardDescription>{t("salary.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="flex flex-col gap-1">
              <span>{t("salary.payableAccount")}</span>
            </Label>
            <LinkField
              doctype="Account"
              value={salaryPayable}
              onChange={(v) => update(company, "salaryPayableAccount", v)}
              filters={[
                ["root_type", "=", "Liability"],
                ["is_group", "=", 0],
              ]}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
