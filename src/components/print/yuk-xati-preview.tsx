"use client";

import { useState } from "react";
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
import { Printer } from "lucide-react";
import { formatNumber } from "@/lib/formatters";
import type { YukXatiData } from "@/lib/utils/invoice-to-yukxati";
import { buildYukXatiHtml } from "./yuk-xati-template";
import { printA4 } from "@/lib/utils/print-a4";

interface YukXatiPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: YukXatiData;
}

export function YukXatiPreview({ open, onOpenChange, data }: YukXatiPreviewProps) {
  const [salesDept, setSalesDept] = useState(data.salesDept ?? "");
  const [warehouseKeeper, setWarehouseKeeper] = useState(data.warehouseKeeper ?? "");
  const [driver, setDriver] = useState(data.driver ?? "");
  const [vehicleNumber, setVehicleNumber] = useState(data.vehicleNumber ?? "");
  const [recipient, setRecipient] = useState(data.recipient ?? "");

  function handlePrint() {
    const html = buildYukXatiHtml({
      ...data,
      salesDept,
      warehouseKeeper,
      driver,
      vehicleNumber,
      recipient,
    });
    printA4(html, `Yuk Xati — ${data.documentNumber}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Yuk Xati — {data.documentNumber}</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="rounded-lg border p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mijoz</span>
            <span className="font-medium">{data.customerName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sana</span>
            <span>{data.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mahsulotlar</span>
            <span>{data.items.length} ta</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Jami summa</span>
            <span className="tabular-nums">{formatNumber(data.grandTotal, 0)}</span>
          </div>
        </div>

        {/* Items preview */}
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Mahsulot</th>
                <th className="p-2 text-right">Korobka</th>
                <th className="p-2 text-right">Birlik</th>
                <th className="p-2 text-right">Dona</th>
                <th className="p-2 text-right">Narxi</th>
                <th className="p-2 text-right">Summa</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.index} className="border-b">
                  <td className="p-2">{item.itemName}</td>
                  <td className="p-2 text-right tabular-nums">{formatNumber(item.qtyBoxes, 0)}</td>
                  <td className="p-2 text-right">{item.pcsPerBox}</td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(item.totalPieces, 0)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(item.pricePerPiece, 0)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {formatNumber(item.totalAmount, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signature inputs */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Imzo qatorlari (ixtiyoriy)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Sotuv bo&apos;limi</Label>
              <Input
                value={salesDept}
                onChange={(e) => setSalesDept(e.target.value)}
                placeholder="F.I.O"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kamera mudiri</Label>
              <Input
                value={warehouseKeeper}
                onChange={(e) => setWarehouseKeeper(e.target.value)}
                placeholder="F.I.O"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Haydovchi</Label>
              <Input
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                placeholder="F.I.O"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mashina raqami</Label>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="01 A 123 AA"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Qabul qiluvchi</Label>
              <Input
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="F.I.O"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Yopish
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 size-4" />
            Chop etish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
