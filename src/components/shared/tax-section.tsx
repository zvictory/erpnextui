"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LinkField } from "@/components/shared/link-field";
import { frappe } from "@/lib/frappe-client";
import { formatNumber } from "@/lib/formatters";
import type { TaxRow, TaxTemplate } from "@/types/tax";

interface TaxSectionProps {
  taxTemplateDoctype: "Sales Taxes and Charges Template" | "Purchase Taxes and Charges Template";
  selectedTemplate: string;
  onTemplateChange: (template: string) => void;
  taxes: TaxRow[];
  onTaxesChange: (taxes: TaxRow[]) => void;
  subtotal: number;
  isEditable: boolean;
}

function computeTaxes(templateTaxes: TaxRow[], subtotal: number): TaxRow[] {
  const result: TaxRow[] = [];
  let cumulative = subtotal;
  for (const row of templateTaxes) {
    let taxAmount = 0;
    if (row.charge_type === "On Net Total") {
      taxAmount = (row.rate / 100) * subtotal;
    } else if (row.charge_type === "On Previous Row Amount" && result.length > 0) {
      taxAmount = (row.rate / 100) * result[result.length - 1].tax_amount;
    } else if (row.charge_type === "On Previous Row Total" && result.length > 0) {
      taxAmount = (row.rate / 100) * (cumulative + result[result.length - 1].tax_amount);
    } else if (row.charge_type === "Actual") {
      taxAmount = row.tax_amount || 0;
    }
    cumulative += taxAmount;
    result.push({ ...row, tax_amount: Math.round(taxAmount * 100) / 100 });
  }
  return result;
}

export function TaxSection({
  taxTemplateDoctype,
  selectedTemplate,
  onTemplateChange,
  taxes,
  onTaxesChange,
  subtotal,
  isEditable,
}: TaxSectionProps) {
  const t = useTranslations("invoices");

  const { data: templateDoc } = useQuery({
    queryKey: ["taxTemplate", taxTemplateDoctype, selectedTemplate],
    queryFn: () => frappe.getDoc<TaxTemplate>(taxTemplateDoctype, selectedTemplate),
    enabled: !!selectedTemplate,
  });

  useEffect(() => {
    if (templateDoc?.taxes) {
      const computed = computeTaxes(templateDoc.taxes, subtotal);
      onTaxesChange(computed);
    }
  }, [templateDoc, subtotal]);

  useEffect(() => {
    if (!selectedTemplate) {
      onTaxesChange([]);
    }
  }, [selectedTemplate]);

  const taxTotal = taxes.reduce((sum, row) => sum + row.tax_amount, 0);
  const grandTotal = subtotal + taxTotal;

  return (
    <div className="space-y-3">
      <Separator />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>{t("taxTemplate")}</Label>
          <LinkField
            doctype={taxTemplateDoctype}
            value={selectedTemplate}
            onChange={onTemplateChange}
            placeholder={t("selectTaxTemplate")}
            disabled={!isEditable}
          />
        </div>
      </div>

      {taxes.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">{t("tax")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("taxRate")}</th>
                <th className="px-3 py-2 text-right font-medium">{t("taxAmount")}</th>
              </tr>
            </thead>
            <tbody>
              {taxes.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-3 py-2">{row.description}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {row.charge_type === "Actual" ? "\u2014" : `${formatNumber(row.rate)}%`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatNumber(row.tax_amount, 2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-col items-end gap-1 text-sm">
        <div className="flex gap-8">
          <span className="text-muted-foreground">{t("subtotal")}</span>
          <span className="tabular-nums font-medium">{formatNumber(subtotal, 2)}</span>
        </div>
        {taxTotal > 0 && (
          <div className="flex gap-8">
            <span className="text-muted-foreground">{t("taxTotal")}</span>
            <span className="tabular-nums font-medium">{formatNumber(taxTotal, 2)}</span>
          </div>
        )}
        <div className="flex gap-8 text-base">
          <span className="font-medium">{t("grandTotal")}</span>
          <span className="tabular-nums font-bold">{formatNumber(grandTotal, 2)}</span>
        </div>
      </div>
    </div>
  );
}
