"use client";

import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Equipment } from "@/types/factory-twin";
import type { ActiveWorkOrder } from "@/hooks/use-factory-twin";
import { formatNumber } from "@/lib/formatters";

interface EquipmentDetailProps {
  equipment: Equipment;
  workOrder?: ActiveWorkOrder;
  onClose: () => void;
}

export function EquipmentDetail({ equipment, workOrder, onClose }: EquipmentDetailProps) {
  const isActive = workOrder?.status === "In Process";
  const progress = workOrder && workOrder.qty > 0
    ? (workOrder.produced_qty / workOrder.qty) * 100
    : 0;

  return (
    <div className="w-72 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-sm">{equipment.id}</span>
          <Badge variant="outline" className="text-[10px] h-4">
            {equipment.type}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="max-h-[400px]">
        <div className="p-3 space-y-3">
          {/* Equipment name */}
          <div>
            <p className="text-sm font-medium">{equipment.label}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
              <span className="text-xs text-muted-foreground">
                {isActive ? "Ishlayapti" : workOrder ? "Kutmoqda" : "Bo'sh"}
              </span>
            </div>
          </div>

          {/* Work Order info */}
          {workOrder && (
            <div className="space-y-1.5 rounded-md border p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Work Order</span>
                <span className="font-mono text-xs">{workOrder.name}</span>
              </div>
              <p className="text-sm font-medium">{workOrder.item_name || workOrder.production_item}</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono tabular-nums">
                    {formatNumber(workOrder.produced_qty)}/{formatNumber(workOrder.qty)} ({Math.round(progress)}%)
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>
            </div>
          )}

          {/* Parameters */}
          {equipment.parameters.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Parametrlar</span>
              {equipment.parameters.map((param) => (
                <div key={param.key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>{param.label}</span>
                    <span className="font-mono tabular-nums text-muted-foreground">
                      — {param.unit}
                    </span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-muted-foreground/20 rounded-full" style={{ width: "0%" }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>{param.min}</span>
                    <span>{param.max} {param.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          {equipment.linkedWorkstation && (
            <div className="pt-1 border-t">
              <span className="text-[10px] text-muted-foreground">Workstation: {equipment.linkedWorkstation}</span>
            </div>
          )}
          {equipment.linkedWarehouse && (
            <div className="pt-1 border-t">
              <span className="text-[10px] text-muted-foreground">Warehouse: {equipment.linkedWarehouse}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
