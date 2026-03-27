"use client";

import { Cylinder, ArrowRight, Package, Warehouse, Fan, Gauge, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/stores/editor-store";
import { EQUIPMENT_CATALOG } from "@/lib/editor/equipment-catalog";
import type { CatalogItem } from "@/types/editor";
import type { Equipment } from "@/types/factory-twin";

const ICON_MAP: Record<string, typeof Cylinder> = {
  cylinder: Cylinder,
  "arrow-right": ArrowRight,
  package: Package,
  warehouse: Warehouse,
  fan: Fan,
  gauge: Gauge,
  zap: Zap,
};

function generateId(type: string, existing: Equipment[]): string {
  const prefix =
    type === "tank" ? "T" : type === "line" ? "L" : type === "warehouse" ? "WH" : type === "pump" ? "P" : "EQ";
  const nums = existing
    .filter((e) => e.id.startsWith(prefix + "-"))
    .map((e) => {
      const parts = e.id.split("-");
      return parseInt(parts[parts.length - 1], 10);
    })
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export function EquipmentCatalog() {
  const { equipment, addEquipment } = useEditorStore();

  const handleAdd = (item: CatalogItem) => {
    const id = generateId(item.type, equipment);
    const newEq: Equipment = {
      id,
      type: item.type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: item.defaultScale,
      label: `${item.label} ${equipment.filter((e) => e.type === item.type).length + 1}`,
      color: item.defaultColor,
      parameters: [...item.defaultParams],
    };
    addEquipment(newEq);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Katalog</h3>
        {EQUIPMENT_CATALOG.map((cat) => (
          <div key={cat.category}>
            <h4 className="text-xs font-medium text-muted-foreground mb-1.5">{cat.category}</h4>
            <div className="space-y-1">
              {cat.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || Package;
                return (
                  <Button
                    key={`${item.type}-${item.label}`}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => handleAdd(item)}
                  >
                    <Icon className="h-3.5 w-3.5 mr-2 shrink-0" style={{ color: item.defaultColor }} />
                    {item.label}
                  </Button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground">
            Uskunani qo'shish uchun bosing. Keyin 3D sahnada joylashtiring.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
