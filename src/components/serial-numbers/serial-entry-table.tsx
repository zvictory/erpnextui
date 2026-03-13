"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface SerialEntryRow {
  serial_no: string;
  custom_imei_1: string;
  custom_imei_2: string;
}

interface SerialEntryTableProps {
  rows: SerialEntryRow[];
  onChange: (rows: SerialEntryRow[]) => void;
  requiredQty: number;
  disabled?: boolean;
}

function emptySerialRow(): SerialEntryRow {
  return { serial_no: "", custom_imei_1: "", custom_imei_2: "" };
}

export function SerialEntryTable({ rows, onChange, requiredQty, disabled }: SerialEntryTableProps) {
  function updateRow(index: number, field: keyof SerialEntryRow, value: string) {
    const updated = rows.map((row, i) => (i === index ? { ...row, [field]: value } : row));
    onChange(updated);
  }

  function addRow() {
    onChange([...rows, emptySerialRow()]);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  const mismatch = rows.length !== requiredQty;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Serial Numbers
          {mismatch && (
            <span className="ml-2 text-xs text-destructive">
              ({rows.length}/{requiredQty} — must match qty)
            </span>
          )}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Serial No</TableHead>
              <TableHead>IMEI 1</TableHead>
              <TableHead>IMEI 2</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No serial numbers added
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={index}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <Input
                      value={row.serial_no}
                      onChange={(e) => updateRow(index, "serial_no", e.target.value)}
                      placeholder="e.g. PHONE-0001"
                      disabled={disabled}
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.custom_imei_1}
                      onChange={(e) => updateRow(index, "custom_imei_1", e.target.value)}
                      placeholder="IMEI 1"
                      disabled={disabled}
                      className="h-8 font-mono text-xs"
                      maxLength={20}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={row.custom_imei_2}
                      onChange={(e) => updateRow(index, "custom_imei_2", e.target.value)}
                      placeholder="IMEI 2"
                      disabled={disabled}
                      className="h-8 font-mono text-xs"
                      maxLength={20}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeRow(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
