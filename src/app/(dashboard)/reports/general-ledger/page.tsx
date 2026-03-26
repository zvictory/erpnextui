"use client";

import { useState } from "react";
import { startOfYear } from "date-fns";
import { useCompanyStore } from "@/stores/company-store";
import { useGeneralLedgerReport } from "@/hooks/use-general-ledger-report";
import { ReportShell } from "@/components/reports/report-shell";
import { ReportKpiCards } from "@/components/reports/report-kpi-cards";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkField } from "@/components/shared/link-field";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/formatters";
import type { DateRange } from "@/types/reports";

export default function GeneralLedgerPage() {
  const { company, currencySymbol, symbolOnRight } = useCompanyStore();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfYear(new Date()),
    to: new Date(),
  });
  const [account, setAccount] = useState("");
  const [party, setParty] = useState("");

  const { data, isLoading, isRefetching, refetch } = useGeneralLedgerReport(
    company,
    dateRange,
    account || undefined,
    party || undefined,
  );

  const kpiItems = [
    { label: "Opening Balance", value: data?.openingBalance ?? 0, format: "currency" as const },
    { label: "Total Debit", value: data?.totalDebit ?? 0, format: "currency" as const },
    { label: "Total Credit", value: data?.totalCredit ?? 0, format: "currency" as const },
    { label: "Closing Balance", value: data?.closingBalance ?? 0, format: "currency" as const },
  ];

  const fmt = (v: number) => formatCurrency(Math.abs(v), currencySymbol, symbolOnRight);

  return (
    <ReportShell
      title="General Ledger"
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      onRefresh={refetch}
      isRefreshing={isRefetching}
      toolbar={
        <div className="flex items-center gap-2">
          <LinkField
            doctype="Account"
            value={account}
            onChange={setAccount}
            placeholder="All Accounts"
            className="h-8 w-[180px] text-sm"
          />
          <LinkField
            doctype="Supplier"
            value={party}
            onChange={setParty}
            placeholder="All Parties"
            className="h-8 w-[180px] text-sm"
          />
        </div>
      }
    >
      <ReportKpiCards items={kpiItems} isLoading={isLoading} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Voucher Type</TableHead>
              <TableHead>Voucher No</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((row, i) => (
              <TableRow key={`${row.voucher_no}-${i}`}>
                <TableCell>{formatDate(row.posting_date)}</TableCell>
                <TableCell>{row.account}</TableCell>
                <TableCell>{row.party ?? ""}</TableCell>
                <TableCell>{row.voucher_type}</TableCell>
                <TableCell className="font-mono text-xs">{row.voucher_no}</TableCell>
                <TableCell className="text-right">{row.debit ? fmt(row.debit) : ""}</TableCell>
                <TableCell className="text-right">{row.credit ? fmt(row.credit) : ""}</TableCell>
                <TableCell className="text-right font-semibold">{fmt(row.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ReportShell>
  );
}
