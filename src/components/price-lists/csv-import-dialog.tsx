"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useImportItemPrices, type CsvImportRow } from "@/hooks/use-price-lists";
import type { PriceListListItem } from "@/types/price-list";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceList: PriceListListItem;
  onSuccess?: () => void;
}

function parseCsv(text: string): CsvImportRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
  const itemCodeIdx = headers.indexOf("item_code");
  const rateIdx = headers.indexOf("price_list_rate");
  const uomIdx = headers.indexOf("uom");
  const minQtyIdx = headers.indexOf("min_qty");

  if (itemCodeIdx === -1 || rateIdx === -1) return [];

  const rows: CsvImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const itemCode = cols[itemCodeIdx];
    const rate = parseFloat(cols[rateIdx]);
    if (!itemCode || isNaN(rate)) continue;

    rows.push({
      item_code: itemCode,
      price_list_rate: rate,
      uom: uomIdx >= 0 ? cols[uomIdx] || undefined : undefined,
      min_qty: minQtyIdx >= 0 ? parseFloat(cols[minQtyIdx]) || undefined : undefined,
    });
  }
  return rows;
}

export function CsvImportDialog({
  open,
  onOpenChange,
  priceList,
  onSuccess,
}: CsvImportDialogProps) {
  const t = useTranslations("priceLists");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<CsvImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const importMutation = useImportItemPrices();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsv(text);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  }

  function handleImport() {
    importMutation.mutate(
      {
        priceList: priceList.name,
        currency: priceList.currency,
        selling: priceList.selling,
        buying: priceList.buying,
        rows: parsedRows,
      },
      {
        onSuccess: (result) => {
          toast.success(
            t("importSuccess", {
              success: result.succeeded,
              failed: result.failed,
            }),
          );
          onOpenChange(false);
          setParsedRows([]);
          setFileName("");
          onSuccess?.();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleClose(value: boolean) {
    if (!value) {
      setParsedRows([]);
      setFileName("");
    }
    onOpenChange(value);
  }

  const previewRows = parsedRows.slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("importCsvTitle")}</DialogTitle>
          <DialogDescription>{t("importCsvDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {fileName || t("selectFile")}
            </Button>
          </div>

          {/* Preview table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t("preview")} ({parsedRows.length} rows)
              </p>
              <div className="rounded-md border max-h-48 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("itemCode")}</TableHead>
                      <TableHead className="text-right">{t("rate")}</TableHead>
                      <TableHead>{t("uom")}</TableHead>
                      <TableHead className="text-right">{t("minQty")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{row.item_code}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.price_list_rate}
                        </TableCell>
                        <TableCell>{row.uom || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {row.min_qty ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {parsedRows.length > 5 && (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center text-xs text-muted-foreground"
                        >
                          +{parsedRows.length - 5} more rows
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Progress */}
          {importMutation.isPending && <Progress value={undefined} className="h-2" />}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedRows.length === 0 || importMutation.isPending}
            >
              {importMutation.isPending
                ? t("saving")
                : `${t("importButton")} (${parsedRows.length})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
