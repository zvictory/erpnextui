"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  FileText,
  ArrowDownToLine,
  FileInput,
  CreditCard,
  PenLine,
  ArrowLeftRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const actions = [
  { tKey: "newInvoice", href: "/sales-invoices/new", icon: FileText },
  { tKey: "receivePayment", href: "/payments/receive", icon: ArrowDownToLine },
  { tKey: "newBill", href: "/purchase-invoices/new", icon: FileInput },
  { tKey: "payBills", href: "/payments/pay", icon: CreditCard },
  { tKey: "writeCheck", href: "/expenses/new", icon: PenLine },
  { tKey: "transferFunds", href: "/funds/transfer", icon: ArrowLeftRight },
] as const;

export function QuickActions() {
  const t = useTranslations("dashboard");
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t("quickActions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 lg:grid-cols-6">
          {actions.map(({ tKey, href, icon: Icon }) => (
            <button
              key={tKey}
              onClick={() => router.push(href)}
              className="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-5 text-muted-foreground" />
              <span className="text-xs font-medium leading-tight">{t(tKey)}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
