"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCompanyStore } from "@/stores/company-store";
import { useCurrencyAudit } from "@/hooks/use-currency-audit";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/shared/date-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";

const doctypeLabels: Record<string, string> = {
  "Payment Entry": "Payment",
  "Journal Entry": "Journal",
  "Sales Invoice": "Sales Invoice",
  "Purchase Invoice": "Purchase Invoice",
};

const doctypePaths: Record<string, (name: string) => string> = {
  "Payment Entry": (name) => `/payments/${encodeURIComponent(name)}`,
  "Journal Entry": () => `/expenses`,
  "Sales Invoice": (name) => `/sales-invoices/${encodeURIComponent(name)}`,
  "Purchase Invoice": (name) => `/purchase-invoices/${encodeURIComponent(name)}`,
};

export default function CurrencyAuditPage() {
  const { company } = useCompanyStore();
  const [fromDate, setFromDate] = useState(format(subMonths(new Date(), 3), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data, isLoading, isRefetching, refetch, error } = useCurrencyAudit(
    company,
    fromDate,
    toDate,
  );

  const totalDrift = data?.reduce((s, m) => s + Math.abs(m.drift), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Currency Audit</h1>
          <p className="text-sm text-muted-foreground">
            Finds GL entries where{" "}
            <code className="rounded bg-muted px-1 text-xs">base_amount ≠ amount × rate</code>{" "}
            (drift &gt; 0.01). These typically come from historical data before the Golden Rule
            fixes.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading || isRefetching}
        >
          <RefreshCw className={isRefetching ? "mr-2 size-4 animate-spin" : "mr-2 size-4"} />
          Re-run
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:max-w-md">
            <div className="space-y-1.5">
              <Label htmlFor="fromDate">From</Label>
              <DateInput
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="toDate">To</Label>
              <DateInput id="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading && <Skeleton className="h-60 w-full" />}

      {error && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-sm text-destructive">
            Failed to load audit: {error instanceof Error ? error.message : "Unknown error"}
          </CardContent>
        </Card>
      )}

      {data && !isLoading && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              label="Mismatches"
              value={String(data.length)}
              tone={data.length === 0 ? "ok" : "warn"}
            />
            <StatCard
              label="Total drift (absolute)"
              value={formatCurrency(totalDrift, "UZS", true)}
              tone={totalDrift === 0 ? "ok" : "warn"}
            />
            <StatCard
              label="Period"
              value={`${fromDate} → ${toDate}`}
            />
            <StatCard label="Company" value={company || "—"} />
          </div>

          {data.length === 0 ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex items-center gap-3 py-6">
                <ShieldCheck className="size-5 text-emerald-500" />
                <div className="text-sm">
                  <strong>All clean.</strong> No currency drift detected in this period.
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="size-4 text-amber-500" />
                  Mismatches
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  sorted by largest drift
                </span>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Type</th>
                        <th className="px-3 py-2 text-left font-medium">Document</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Party</th>
                        <th className="px-3 py-2 text-left font-medium">Field</th>
                        <th className="px-3 py-2 text-right font-medium">Expected (UZS)</th>
                        <th className="px-3 py-2 text-right font-medium">Actual (UZS)</th>
                        <th className="px-3 py-2 text-right font-medium">Drift</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((m, i) => {
                        const pathFn = doctypePaths[m.doctype];
                        const href = pathFn ? pathFn(m.name) : null;
                        return (
                          <tr key={`${m.doctype}-${m.name}-${i}`} className="border-b">
                            <td className="px-3 py-2">{doctypeLabels[m.doctype]}</td>
                            <td className="px-3 py-2 font-mono text-xs">
                              {href ? (
                                <Link href={href} className="text-primary hover:underline">
                                  {m.name}
                                </Link>
                              ) : (
                                m.name
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {m.posting_date}
                            </td>
                            <td className="px-3 py-2 text-xs">{m.party ?? "—"}</td>
                            <td className="px-3 py-2 text-xs">{m.field}</td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {formatCurrency(m.expectedBase, "UZS", true)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-xs">
                              {formatCurrency(m.actualBase, "UZS", true)}
                            </td>
                            <td
                              className={
                                "px-3 py-2 text-right font-mono text-xs font-semibold " +
                                (Math.abs(m.drift) > 1
                                  ? "text-destructive"
                                  : "text-amber-600")
                              }
                            >
                              {m.drift > 0 ? "+" : ""}
                              {formatCurrency(m.drift, "UZS", true)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
}) {
  const border =
    tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : tone === "ok"
        ? "border-emerald-500/30 bg-emerald-500/5"
        : "";
  return (
    <div className={"rounded-lg border bg-card p-3 " + border}>
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
