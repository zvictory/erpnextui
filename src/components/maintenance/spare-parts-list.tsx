"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { getSpareParts, createSparePart } from "@/actions/spare-parts";
import { formatNumber } from "@/lib/formatters";
import type { SparePartFormValues } from "@/types/maintenance";

export function SparePartsList() {
  const t = useTranslations("maintenance");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["spareParts"],
    queryFn: () => getSpareParts(),
  });

  const parts = result?.success ? result.data : [];

  const [formData, setFormData] = useState<SparePartFormValues>({
    partCode: "",
    name: "",
    category: "",
    minStock: 0,
    reorderQty: 0,
    storageLocation: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: SparePartFormValues) => createSparePart(data),
    onSuccess: (res) => {
      if (res.success) {
        toast.success(t("sparePartCreated"));
        qc.invalidateQueries({ queryKey: ["spareParts"] });
        setOpen(false);
        setFormData({
          partCode: "",
          name: "",
          category: "",
          minStock: 0,
          reorderQty: 0,
          storageLocation: "",
        });
      } else {
        toast.error(res.error);
      }
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("spareParts")}</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" />
              {t("newSparePart")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("newSparePart")}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>
                    {t("partCode")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.partCode}
                    onChange={(e) => setFormData((p) => ({ ...p, partCode: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {t("partName")} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>{t("category")}</Label>
                  <Input
                    value={formData.category ?? ""}
                    onChange={(e) => setFormData((p) => ({ ...p, category: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("minStock")}</Label>
                  <Input
                    type="number"
                    value={formData.minStock ?? 0}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        minStock: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("reorderQty")}</Label>
                  <Input
                    type="number"
                    value={formData.reorderQty ?? 0}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        reorderQty: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>{t("storageLocation")}</Label>
                <Input
                  value={formData.storageLocation ?? ""}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      storageLocation: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? t("saving") : t("save")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {parts.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noSpareParts")}</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("partCode")}</TableHead>
                <TableHead>{t("partName")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead className="text-right">{t("currentStock")}</TableHead>
                <TableHead className="text-right">{t("minStock")}</TableHead>
                <TableHead>{t("storageLocation")}</TableHead>
                <TableHead>{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parts.map((part) => {
                const lowStock =
                  part.currentStock !== null &&
                  part.minStock !== null &&
                  part.currentStock < part.minStock;
                return (
                  <TableRow key={part.id}>
                    <TableCell className="font-medium">{part.partCode}</TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.category ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      {formatNumber(part.currentStock ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">{formatNumber(part.minStock ?? 0)}</TableCell>
                    <TableCell>{part.storageLocation ?? "—"}</TableCell>
                    <TableCell>
                      {lowStock ? (
                        <Badge variant="destructive" className="text-xs">
                          {t("lowStock")}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-emerald-600">
                          {t("inStock")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
