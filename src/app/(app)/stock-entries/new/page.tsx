"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormPageLayout } from "@/components/shared/form-page-layout";
import { LinkField } from "@/components/shared/link-field";
import { SerialEntryTable } from "@/components/serial-numbers/serial-entry-table";
import type { SerialEntryRow } from "@/components/serial-numbers/serial-entry-table";
import { useCreateStockEntry } from "@/hooks/use-stock-entries";
import { batchUpdateIMEI } from "@/hooks/use-serial-numbers";
import { frappe } from "@/lib/frappe-client";
import { useCompanyStore } from "@/stores/company-store";
import type { StockEntryDetail } from "@/types/stock-entry";

type EntryType = "Material Receipt" | "Material Issue" | "Material Transfer";

const PARAM_TO_TYPE: Record<string, EntryType> = {
  "material-receipt": "Material Receipt",
  "material-issue": "Material Issue",
  "material-transfer": "Material Transfer",
};

interface ItemRow {
  item_code: string;
  qty: number;
  basic_rate: number;
  uom: string;
  s_warehouse: string;
  t_warehouse: string;
  has_serial_no: boolean;
  serials: SerialEntryRow[];
}

function emptyRow(): ItemRow {
  return {
    item_code: "",
    qty: 1,
    basic_rate: 0,
    uom: "Nos",
    s_warehouse: "",
    t_warehouse: "",
    has_serial_no: false,
    serials: [],
  };
}

export default function NewStockEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const { company } = useCompanyStore();

  const typeParam = searchParams.get("type") ?? "";
  const initialType = PARAM_TO_TYPE[typeParam] ?? "Material Receipt";

  const [entryType, setEntryType] = useState<EntryType>(initialType);
  const [postingDate, setPostingDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [fromWarehouse, setFromWarehouse] = useState("");
  const [toWarehouse, setToWarehouse] = useState("");
  const [items, setItems] = useState<ItemRow[]>([emptyRow()]);

  const createEntry = useCreateStockEntry();

  const showFrom = entryType === "Material Issue" || entryType === "Material Transfer";
  const showTo = entryType === "Material Receipt" || entryType === "Material Transfer";

  function updateItem(index: number, field: keyof ItemRow, value: string | number) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  }

  async function handleItemChange(index: number, itemCode: string) {
    updateItem(index, "item_code", itemCode);
    if (itemCode) {
      try {
        const item = await frappe.getDoc<{ has_serial_no: 0 | 1 }>("Item", itemCode);
        setItems((prev) =>
          prev.map((row, i) =>
            i === index ? { ...row, has_serial_no: item.has_serial_no === 1 } : row,
          ),
        );
      } catch {
        // Item not found or no access — treat as not serialized
      }
    } else {
      setItems((prev) =>
        prev.map((row, i) => (i === index ? { ...row, has_serial_no: false, serials: [] } : row)),
      );
    }
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function addItem() {
    setItems((prev) => [...prev, emptyRow()]);
  }

  function handleSubmit() {
    const validItems = items.filter((item) => item.item_code && item.qty > 0);
    if (validItems.length === 0) {
      toast.error(t("addItem"));
      return;
    }

    // Validate serial counts match qty
    for (const item of validItems) {
      if (item.has_serial_no) {
        const validSerials = item.serials.filter((s) => s.serial_no);
        if (validSerials.length !== item.qty) {
          toast.error(
            `${item.item_code}: ${validSerials.length} serial numbers provided, ${item.qty} required`,
          );
          return;
        }
      }
    }

    // Collect IMEI updates for after submission
    const imeiUpdates: { serial_no: string; custom_imei_1?: string; custom_imei_2?: string }[] = [];

    const stockItems: StockEntryDetail[] = validItems.map((item) => {
      const serialNoStr = item.has_serial_no
        ? item.serials
            .filter((s) => s.serial_no)
            .map((s) => s.serial_no)
            .join("\n")
        : undefined;

      // Collect IMEI data for post-submit update
      if (item.has_serial_no) {
        for (const s of item.serials) {
          if (s.serial_no && (s.custom_imei_1 || s.custom_imei_2)) {
            imeiUpdates.push({
              serial_no: s.serial_no,
              custom_imei_1: s.custom_imei_1 || undefined,
              custom_imei_2: s.custom_imei_2 || undefined,
            });
          }
        }
      }

      return {
        doctype: "Stock Entry Detail" as const,
        item_code: item.item_code,
        qty: item.qty,
        basic_rate: item.basic_rate,
        amount: item.qty * item.basic_rate,
        uom: item.uom || "Nos",
        ...(serialNoStr ? { serial_no: serialNoStr } : {}),
        ...(showFrom
          ? {
              s_warehouse:
                entryType === "Material Transfer"
                  ? item.s_warehouse || fromWarehouse
                  : fromWarehouse,
            }
          : {}),
        ...(showTo
          ? {
              t_warehouse:
                entryType === "Material Transfer" ? item.t_warehouse || toWarehouse : toWarehouse,
            }
          : {}),
      };
    });

    createEntry.mutate(
      {
        stock_entry_type: entryType,
        posting_date: postingDate,
        company,
        ...(showFrom ? { from_warehouse: fromWarehouse } : {}),
        ...(showTo ? { to_warehouse: toWarehouse } : {}),
        items: stockItems,
      },
      {
        onSuccess: async () => {
          // Step 2: Batch-update IMEI codes on created serial numbers
          if (imeiUpdates.length > 0) {
            const results = await batchUpdateIMEI(imeiUpdates);
            const failures = results.filter((r) => !r.success);
            if (failures.length > 0) {
              toast.warning(
                `Stock received. ${failures.length} IMEI update(s) failed — edit them manually.`,
              );
            } else {
              toast.success(tc("submit"));
            }
          } else {
            toast.success(tc("submit"));
          }
          router.push("/stock-entries");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  const colSpan = entryType === "Material Transfer" ? 8 : 6;

  return (
    <FormPageLayout title={t("newStockEntry")} backHref="/stock-entries">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("entryType")}</Label>
            <Select value={entryType} onValueChange={(v) => setEntryType(v as EntryType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Material Receipt">{t("materialReceipt")}</SelectItem>
                <SelectItem value="Material Issue">{t("materialIssue")}</SelectItem>
                <SelectItem value="Material Transfer">{t("materialTransfer")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{tc("date")}</Label>
            <Input
              type="date"
              value={postingDate}
              onChange={(e) => setPostingDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {showFrom && (
            <div className="space-y-2">
              <Label>{t("fromWarehouse")}</Label>
              <LinkField
                doctype="Warehouse"
                value={fromWarehouse}
                onChange={setFromWarehouse}
                placeholder={t("selectWarehouse")}
              />
            </div>
          )}
          {showTo && (
            <div className="space-y-2">
              <Label>{t("toWarehouse")}</Label>
              <LinkField
                doctype="Warehouse"
                value={toWarehouse}
                onChange={setToWarehouse}
                placeholder={t("selectWarehouse")}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base">{t("item")}</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" />
              {t("addItem")}
            </Button>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("item")}</TableHead>
                  <TableHead className="w-24">{t("qty")}</TableHead>
                  <TableHead className="w-28">{t("rate")}</TableHead>
                  <TableHead className="w-28 text-right">{t("amount")}</TableHead>
                  {entryType === "Material Transfer" && (
                    <>
                      <TableHead>{t("sourceWarehouse")}</TableHead>
                      <TableHead>{t("targetWarehouse")}</TableHead>
                    </>
                  )}
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <>
                    <TableRow key={index}>
                      <TableCell>
                        <LinkField
                          doctype="Item"
                          value={item.item_code}
                          onChange={(v) => handleItemChange(index, v)}
                          placeholder={t("selectItem")}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(index, "qty", parseFloat(e.target.value) || 0)
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.basic_rate}
                          onChange={(e) =>
                            updateItem(index, "basic_rate", parseFloat(e.target.value) || 0)
                          }
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {(item.qty * item.basic_rate).toFixed(2)}
                      </TableCell>
                      {entryType === "Material Transfer" && (
                        <>
                          <TableCell>
                            <LinkField
                              doctype="Warehouse"
                              value={item.s_warehouse}
                              onChange={(v) => updateItem(index, "s_warehouse", v)}
                              placeholder={t("selectWarehouse")}
                            />
                          </TableCell>
                          <TableCell>
                            <LinkField
                              doctype="Warehouse"
                              value={item.t_warehouse}
                              onChange={(v) => updateItem(index, "t_warehouse", v)}
                              placeholder={t("selectWarehouse")}
                            />
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            title={tc("removeRow")}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {item.has_serial_no && (
                      <TableRow key={`serial-${index}`}>
                        <TableCell colSpan={colSpan} className="bg-muted/30 p-3">
                          <SerialEntryTable
                            rows={item.serials}
                            onChange={(serials) =>
                              setItems((prev) =>
                                prev.map((r, i) => (i === index ? { ...r, serials } : r)),
                              )
                            }
                            requiredQty={item.qty}
                            disabled={createEntry.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={createEntry.isPending}>
            {createEntry.isPending ? tc("loading") : tc("submit")}
          </Button>
        </div>
      </div>
    </FormPageLayout>
  );
}
