"use client";

import {
  Cylinder, ArrowRight, Package, Warehouse, Fan, Gauge, Zap, Truck, Droplets, Wind,
  Thermometer, Clock, Snowflake, GitBranch, Tag, Printer, Scan, Scale, Activity,
  ArrowUpCircle, ToggleRight, Flame, FlaskConical, CupSoda, Box, Cherry,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/stores/editor-store";
import { EQUIPMENT_CATALOG } from "@/lib/editor/equipment-catalog";
import type { CatalogItem } from "@/types/editor";
import type { Equipment } from "@/types/factory-twin";

const ICON_MAP: Record<string, LucideIcon> = {
  cylinder: Cylinder,
  "arrow-right": ArrowRight,
  package: Package,
  warehouse: Warehouse,
  fan: Fan,
  gauge: Gauge,
  zap: Zap,
  truck: Truck,
  droplets: Droplets,
  wind: Wind,
  thermometer: Thermometer,
  clock: Clock,
  snowflake: Snowflake,
  "git-branch": GitBranch,
  tag: Tag,
  printer: Printer,
  scan: Scan,
  scale: Scale,
  activity: Activity,
  "arrow-up-circle": ArrowUpCircle,
  "toggle-right": ToggleRight,
  flame: Flame,
  "flask-conical": FlaskConical,
  "cup-soda": CupSoda,
  box: Box,
  cherry: Cherry,
  cone: Cylinder,
  popsicle: Package,
  sandwich: Package,
};

function generateId(prefix: string, existing: Equipment[]): string {
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
    const id = generateId(item.idPrefix, equipment);
    const newEq: Equipment = {
      id,
      type: item.type,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: item.defaultScale,
      label: item.label,
      color: item.defaultColor,
      parameters: [...item.defaultParams],
    };
    addEquipment(newEq);
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-3 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Katalog
        </h3>
        {EQUIPMENT_CATALOG.map((cat) => (
          <div key={cat.category}>
            <h4 className="text-[10px] font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              {cat.category}
            </h4>
            <div className="space-y-0.5">
              {cat.items.map((item) => {
                const Icon = ICON_MAP[item.icon] || Package;
                return (
                  <Button
                    key={item.subtype}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start h-7 text-[11px] px-2"
                    onClick={() => handleAdd(item)}
                  >
                    <Icon className="h-3 w-3 mr-1.5 shrink-0" style={{ color: item.defaultColor }} />
                    <span className="truncate">{item.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-2 border-t">
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Uskunani qo'shish uchun bosing. Keyin 3D sahnada joylashtiring.
          </p>
        </div>
      </div>
    </ScrollArea>
  );
}
