"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  useReceiptSettingsStore,
  type PaperWidth,
  type ReceiptFontSize,
  type ItemDisplay,
} from "@/stores/receipt-settings-store";

interface ReceiptSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptSettingsPanel({ open, onOpenChange }: ReceiptSettingsPanelProps) {
  const s = useReceiptSettingsStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Receipt Settings</SheetTitle>
          <SheetDescription>
            Customize the receipt layout. Changes apply instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Paper width */}
          <fieldset className="space-y-2">
            <Label>Paper Width</Label>
            <div className="flex gap-3">
              {(["80mm", "58mm"] as PaperWidth[]).map((w) => (
                <label key={w} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="paperWidth"
                    value={w}
                    checked={s.paperWidth === w}
                    onChange={() => s.setPaperWidth(w)}
                    className="accent-primary"
                  />
                  {w}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Font size */}
          <fieldset className="space-y-2">
            <Label>Font Size</Label>
            <div className="flex gap-3">
              {(["small", "medium", "large"] as ReceiptFontSize[]).map((f) => (
                <label key={f} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="fontSize"
                    value={f}
                    checked={s.fontSize === f}
                    onChange={() => s.setFontSize(f)}
                    className="accent-primary"
                  />
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Header lines */}
          <div className="space-y-3">
            <Label>Header Lines</Label>
            <Input
              placeholder="Address line"
              value={s.headerLine1}
              onChange={(e) => s.setHeaderLine1(e.target.value)}
            />
            <Input
              placeholder="Phone number"
              value={s.headerLine2}
              onChange={(e) => s.setHeaderLine2(e.target.value)}
            />
            <Input
              placeholder="VAT / Tax ID"
              value={s.headerLine3}
              onChange={(e) => s.setHeaderLine3(e.target.value)}
            />
          </div>

          {/* Item display */}
          <fieldset className="space-y-2">
            <Label>Item Label</Label>
            <div className="flex gap-3">
              {(
                [
                  ["code", "Code"],
                  ["name", "Name"],
                  ["both", "Both"],
                ] as [ItemDisplay, string][]
              ).map(([value, label]) => (
                <label key={value} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name="itemDisplay"
                    value={value}
                    checked={s.itemDisplay === value}
                    onChange={() => s.setItemDisplay(value)}
                    className="accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Toggles */}
          <div className="space-y-3">
            <Label>Display Options</Label>
            <ToggleRow
              label="Show customer name"
              checked={s.showCustomerName}
              onChange={s.setShowCustomerName}
            />
            <ToggleRow label="Show due date" checked={s.showDueDate} onChange={s.setShowDueDate} />
            <ToggleRow
              label="Show item rate breakdown"
              checked={s.showItemRate}
              onChange={s.setShowItemRate}
            />
            <ToggleRow label="Show UOM" checked={s.showItemUom} onChange={s.setShowItemUom} />
            <ToggleRow label="Show QR code" checked={s.showQrCode} onChange={s.setShowQrCode} />
          </div>

          {/* Footer */}
          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Textarea
              placeholder="Thank you for your business!"
              value={s.footerText}
              onChange={(e) => s.setFooterText(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
