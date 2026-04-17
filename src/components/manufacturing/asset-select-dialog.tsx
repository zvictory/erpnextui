"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAssetList } from "@/hooks/use-work-order-assets";

interface AssetSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (assetId: number) => void;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  operational: "default",
  maintenance: "secondary",
  broken: "destructive",
  retired: "outline",
};

const statusLabel: Record<string, string> = {
  operational: "Ishlaydi",
  maintenance: "Tamirda",
  broken: "Singan",
  retired: "O'chirilgan",
};

export function AssetSelectDialog({ open, onOpenChange, onSelect }: AssetSelectDialogProps) {
  const t = useTranslations("mfg.workOrders");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const { data: assetList = [] } = useAssetList(search);

  const handleConfirm = () => {
    if (selected !== null) {
      onSelect(selected);
      setSelected(null);
      setSearch("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setSelected(null);
          setSearch("");
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("selectMachine")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchMachine")}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
          {assetList.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noMachines")}</p>
          ) : (
            <div className="space-y-1">
              {assetList.map((asset) => {
                const isDisabled = asset.status === "broken" || asset.status === "retired";
                return (
                  <button
                    key={asset.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setSelected(asset.id)}
                    className={`w-full text-left rounded-md border p-3 transition-colors ${
                      selected === asset.id
                        ? "border-primary bg-primary/5"
                        : "border-transparent hover:bg-muted/50"
                    } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs text-muted-foreground">
                          {asset.assetCode}
                        </span>
                        <span className="ml-2 font-medium text-sm">{asset.name}</span>
                      </div>
                      {asset.status && asset.status !== "operational" && (
                        <Badge variant={statusVariant[asset.status] ?? "outline"} className="text-xs">
                          {statusLabel[asset.status] ?? asset.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[asset.location, asset.powerKw ? `${asset.powerKw} kW` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={selected === null}>
            {t("select")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
