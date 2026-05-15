"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LinkField } from "@/components/shared/link-field";
import { useLinkPartner, useSearchByTaxId } from "@/lib/api/partners";

interface LinkPartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LinkPartnerDialog({ open, onOpenChange }: LinkPartnerDialogProps) {
  const t = useTranslations("partners");
  const [customerId, setCustomerId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [taxId, setTaxId] = useState("");

  const linkPartner = useLinkPartner();
  const { data: taxIdResult } = useSearchByTaxId(taxId);

  function handleLink() {
    const cId = taxIdResult?.customer?.name || customerId;
    const sId = taxIdResult?.supplier?.name || supplierId;

    if (!cId || !sId) {
      toast.error("Select both Customer and Supplier");
      return;
    }

    linkPartner.mutate(
      { customerId: cId, supplierId: sId },
      {
        onSuccess: () => {
          toast.success(t("linkPartner") + " — OK");
          setCustomerId("");
          setSupplierId("");
          setTaxId("");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("linkPartner")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Customer</Label>
            <LinkField doctype="Customer" value={customerId} onChange={setCustomerId} />
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <LinkField doctype="Supplier" value={supplierId} onChange={setSupplierId} />
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">{t("searchByInn")}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>INN</Label>
            <Input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="12345678"
            />
          </div>

          {taxIdResult && (taxIdResult.customer || taxIdResult.supplier) && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Customer:</span>
                {taxIdResult.customer ? (
                  <Badge variant="outline" className="text-green-700 dark:text-green-400">
                    {taxIdResult.customer.customer_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Supplier:</span>
                {taxIdResult.supplier ? (
                  <Badge variant="outline" className="text-green-700 dark:text-green-400">
                    {taxIdResult.supplier.supplier_name}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={linkPartner.isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleLink} disabled={linkPartner.isPending}>
            {linkPartner.isPending ? "..." : t("linkPartner")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
