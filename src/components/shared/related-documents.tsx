"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { frappe } from "@/lib/frappe-client";

interface RelatedDocumentsProps {
  doctype: string;
  name: string;
}

const routeMap: Record<string, (name: string) => string> = {
  "Sales Invoice": (n) => `/sales-invoices/${encodeURIComponent(n)}`,
  "Purchase Invoice": (n) => `/purchase-invoices/${encodeURIComponent(n)}`,
  "Payment Entry": () => `/payments`,
  "Sales Order": (n) => `/sales-orders/${encodeURIComponent(n)}`,
  "Purchase Order": (n) => `/purchase-orders/${encodeURIComponent(n)}`,
  "Journal Entry": () => `/expenses/new`,
};

interface LinkedDoc {
  name: string;
  docstatus?: number;
}

function getStatusVariant(docstatus: number | undefined): "default" | "secondary" | "destructive" {
  switch (docstatus) {
    case 1:
      return "default";
    case 2:
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(docstatus: number | undefined): string {
  switch (docstatus) {
    case 1:
      return "Submitted";
    case 2:
      return "Cancelled";
    default:
      return "Draft";
  }
}

export function RelatedDocuments({ doctype, name }: RelatedDocumentsProps) {
  const t = useTranslations("common");
  const tStatus = useTranslations("status");

  const { data, isLoading } = useQuery({
    queryKey: ["relatedDocuments", doctype, name],
    queryFn: async () => {
      try {
        const result = await frappe.call<Record<string, LinkedDoc[]>>(
          "frappe.desk.form.utils.get_linked_docs",
          { doctype, name },
        );
        return result;
      } catch {
        return null;
      }
    },
    enabled: !!doctype && !!name,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Filter to only supported doctypes that have route mappings
  const groups = data
    ? Object.entries(data).filter(
        ([dt, docs]) => routeMap[dt] && Array.isArray(docs) && docs.length > 0,
      )
    : [];

  if (groups.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">{t("relatedDocuments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noRelatedDocuments")}</p>
        </CardContent>
      </Card>
    );
  }

  const statusKeyMap: Record<string, string> = {
    Draft: "draft",
    Submitted: "submitted",
    Cancelled: "cancelled",
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{t("relatedDocuments")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.map(([dt, docs]) => (
          <div key={dt}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{dt}</p>
            <div className="space-y-1">
              {docs.map((doc) => {
                const href = routeMap[dt]?.(doc.name);
                const statusLabel = getStatusLabel(doc.docstatus);
                const statusKey = statusKeyMap[statusLabel];
                return (
                  <div
                    key={doc.name}
                    className="flex items-center justify-between rounded-md border px-3 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground" />
                      {href ? (
                        <Link
                          href={href}
                          className="text-sm text-primary underline-offset-4 hover:underline"
                        >
                          {doc.name}
                        </Link>
                      ) : (
                        <span className="text-sm">{doc.name}</span>
                      )}
                    </div>
                    <Badge variant={getStatusVariant(doc.docstatus)} className="text-[10px]">
                      {statusKey ? tStatus(statusKey) : statusLabel}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
