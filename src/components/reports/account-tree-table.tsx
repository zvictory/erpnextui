"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { AccountRow, PeriodKey } from "@/types/reports";

interface AccountTreeTableProps {
  title: string;
  accounts: AccountRow[];
  periods: PeriodKey[];
  currencySymbol: string;
  symbolOnRight: boolean;
}

export function AccountTreeTable({
  title,
  accounts,
  periods,
  currencySymbol,
  symbolOnRight,
}: AccountTreeTableProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Account</TableHead>
              {periods.map((p) => (
                <TableHead key={p.key} className="text-right">
                  {p.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((row, i) => {
              const isGroup = row.is_group || row.indent <= 1;
              return (
                <TableRow key={`${row.account}-${i}`}>
                  <TableCell
                    style={{ paddingLeft: `${row.indent * 1.5 + 0.5}rem` }}
                    className={isGroup ? "font-semibold" : ""}
                  >
                    {row.account_name}
                  </TableCell>
                  {periods.map((p) => (
                    <TableCell
                      key={p.key}
                      className={`text-right ${isGroup ? "font-semibold" : ""}`}
                    >
                      {formatCurrency(
                        Math.abs(Number(row[p.key] ?? 0)),
                        currencySymbol,
                        symbolOnRight,
                      )}
                    </TableCell>
                  ))}
                  <TableCell className={`text-right ${isGroup ? "font-semibold" : ""}`}>
                    {formatCurrency(Math.abs(row.total), currencySymbol, symbolOnRight)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
