"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import {
  useCreateCustomCapability,
  useDeleteCustomCapability,
  useCustomCapabilities,
} from "@/hooks/use-admin-permissions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

const SCOPE_DIM_OPTIONS = [
  { value: "none", label: "Unscoped" },
  { value: "line", label: "Line" },
  { value: "warehouse", label: "Warehouse" },
  { value: "company", label: "Company" },
];

export function CustomCapabilityManager() {
  const t = useTranslations("permissions");
  const { data: caps = [], isLoading } = useCustomCapabilities();
  const createMut = useCreateCustomCapability();
  const deleteMut = useDeleteCustomCapability();

  const [createOpen, setCreateOpen] = useState(false);
  const [id, setId] = useState("");
  const [module, setModule] = useState("");
  const [labelKey, setLabelKey] = useState("");
  const [scopeDim, setScopeDim] = useState<string>("none");

  const handleCreate = async () => {
    if (!id.trim() || !module.trim() || !labelKey.trim()) return;
    try {
      await createMut.mutateAsync({
        id: id.trim(),
        module: module.trim(),
        labelKey: labelKey.trim(),
        scopeDim: scopeDim === "none" ? null : (scopeDim as "line" | "warehouse" | "company"),
      });
      toast.success(t("capCreated"));
      setId("");
      setModule("");
      setLabelKey("");
      setScopeDim("none");
      setCreateOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  const handleDelete = async (capId: string) => {
    if (!confirm(t("capDeleteConfirm", { id: capId }))) return;
    try {
      await deleteMut.mutateAsync(capId);
      toast.success(t("capDeleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-8 w-full bg-muted animate-pulse rounded" />
        <div className="h-8 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{t("noCustomCaps")}</p>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            {t("newCap")}
          </Button>
        </div>

        {caps.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("capId")}</TableHead>
                <TableHead>{t("capModule")}</TableHead>
                <TableHead>{t("capLabel")}</TableHead>
                <TableHead>{t("capScopeDim")}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {caps.map((cap) => (
                <TableRow key={cap.id}>
                  <TableCell className="font-mono text-xs">{cap.id}</TableCell>
                  <TableCell className="text-xs">{cap.module}</TableCell>
                  <TableCell className="text-xs">{cap.labelKey}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {cap.scopeDim ?? t("unscoped")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(cap.id)}
                      disabled={deleteMut.isPending}
                    >
                      {t("capDelete")}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("capCreateTitle")}</DialogTitle>
            <DialogDescription />
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cap-id">{t("capId")}</Label>
              <Input
                id="cap-id"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={t("capIdHint")}
                className="font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-module">{t("capModule")}</Label>
              <Input
                id="cap-module"
                value={module}
                onChange={(e) => setModule(e.target.value)}
                placeholder={t("capModuleHint")}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-label">{t("capLabel")}</Label>
              <Input
                id="cap-label"
                value={labelKey}
                onChange={(e) => setLabelKey(e.target.value)}
                placeholder={t("capLabelHint")}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("capScopeDim")}</Label>
              <Select value={scopeDim} onValueChange={setScopeDim}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_DIM_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t("capScopeDimHint")}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!id.trim() || !module.trim() || !labelKey.trim() || createMut.isPending}
            >
              {createMut.isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
