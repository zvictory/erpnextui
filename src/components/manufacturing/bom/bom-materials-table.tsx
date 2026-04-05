"use client";

import {
  useFieldArray,
  type Control,
  type UseFormRegister,
  type UseFormWatch,
  type UseFormSetValue,
} from "react-hook-form";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkField } from "@/components/shared/link-field";
import { formatNumber } from "@/lib/formatters";
import type { BOMFormValues } from "@/lib/schemas/manufacturing-schemas";

interface BomMaterialsTableProps {
  control: Control<BOMFormValues>;
  register: UseFormRegister<BOMFormValues>;
  watch: UseFormWatch<BOMFormValues>;
  setValue: UseFormSetValue<BOMFormValues>;
}

export function BomMaterialsTable({ control, register, watch, setValue }: BomMaterialsTableProps) {
  const t = useTranslations("mfg.bom");
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const watchedItems = watch("items") ?? [];

  const totalAmount = watchedItems.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0,
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">{t("materials")}</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ item_code: "", qty: 1, rate: 0, stock_uom: "", source_warehouse: "" })
          }
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("addMaterial")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-[200px]">{t("item")}</TableHead>
                <TableHead className="w-24">{t("quantity")}</TableHead>
                <TableHead className="w-28">{t("rate")}</TableHead>
                <TableHead className="w-28 text-right">{t("amount")}</TableHead>
                <TableHead className="w-24">{t("uom")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                    {t("addMaterial")}
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field, index) => {
                  const qty = Number(watchedItems[index]?.qty) || 0;
                  const rate = Number(watchedItems[index]?.rate) || 0;
                  const amount = qty * rate;

                  return (
                    <TableRow key={field.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <LinkField
                          doctype="Item"
                          value={watchedItems[index]?.item_code ?? ""}
                          onChange={(val) =>
                            setValue(`items.${index}.item_code`, val, {
                              shouldValidate: true,
                            })
                          }
                          placeholder={`${t("item")}...`}
                          descriptionField="item_name"
                          showValueWithDescription
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          min={0.001}
                          className="w-full"
                          {...register(`items.${index}.qty`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          className="w-full"
                          {...register(`items.${index}.rate`)}
                        />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(amount, 2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          className="w-full"
                          placeholder={t("uom")}
                          {...register(`items.${index}.stock_uom`)}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}

              {/* Running total */}
              {fields.length > 0 && (
                <TableRow className="font-medium">
                  <TableCell colSpan={4} className="text-right">
                    {t("totalCost")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(totalAmount, 2)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
