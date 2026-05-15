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
import { frappe } from "@/lib/frappe-client";
import type { Workstation } from "@/types/manufacturing";
import type { BOMFormValues } from "@/lib/schemas/manufacturing-schemas";

interface BomOperationsTableProps {
  control: Control<BOMFormValues>;
  register: UseFormRegister<BOMFormValues>;
  watch: UseFormWatch<BOMFormValues>;
  setValue: UseFormSetValue<BOMFormValues>;
}

export function BomOperationsTable({
  control,
  register,
  watch,
  setValue,
}: BomOperationsTableProps) {
  const t = useTranslations("mfg.bom");
  const { fields, append, remove } = useFieldArray({ control, name: "operations" });

  const watchedOperations = watch("operations") ?? [];

  async function handleWorkstationChange(index: number, workstationName: string) {
    setValue(`operations.${index}.workstation`, workstationName, { shouldValidate: true });

    if (workstationName) {
      try {
        const ws = await frappe.getDoc<Workstation>("Workstation", workstationName);
        if (ws.hour_rate) {
          // Store hour_rate on the form field for cost computation display
          // The schema doesn't include hour_rate, but we use it for UI computation
          (setValue as (path: string, value: unknown) => void)(
            `operations.${index}.hour_rate`,
            ws.hour_rate,
          );
        }
      } catch {
        // Workstation fetch failed, leave hour_rate as is
      }
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-medium">{t("operations")}</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ operation: "", workstation: "", time_in_mins: 0, batch_size: 1 })}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("addOperation")}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead className="min-w-[160px]">{t("operations")}</TableHead>
                <TableHead className="min-w-[180px]">Workstation</TableHead>
                <TableHead className="w-28">{t("time")}</TableHead>
                <TableHead className="w-28">{t("hourRate")}</TableHead>
                <TableHead className="w-32 text-right">{t("operatingCost")}</TableHead>
                <TableHead className="w-24">{t("batchSize")}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-16 text-center text-muted-foreground">
                    {t("addOperation")}
                  </TableCell>
                </TableRow>
              ) : (
                fields.map((field, index) => {
                  const op = watchedOperations[index];
                  const time = Number(op?.time_in_mins) || 0;
                  const hourRate = Number(
                    (op as Record<string, unknown> | undefined)?.hour_rate ?? 0,
                  );
                  const opCost = (time / 60) * hourRate;

                  return (
                    <TableRow key={field.id}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          placeholder={t("operations")}
                          {...register(`operations.${index}.operation`)}
                        />
                      </TableCell>
                      <TableCell>
                        <LinkField
                          doctype="Workstation"
                          value={op?.workstation ?? ""}
                          onChange={(val) => handleWorkstationChange(index, val)}
                          placeholder="Workstation..."
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="any"
                          min={0}
                          className="w-full"
                          {...register(`operations.${index}.time_in_mins`)}
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {formatNumber(hourRate, 2)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(opCost, 2)}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          className="w-full"
                          {...register(`operations.${index}.batch_size`)}
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
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
