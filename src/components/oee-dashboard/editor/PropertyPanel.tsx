"use client";

import { Trash2, Copy, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/stores/editor-store";
import type { Equipment, ParameterConfig } from "@/types/factory-twin";

const EQUIPMENT_TYPES = [
  { value: "tank", label: "Qozon" },
  { value: "line", label: "Liniya" },
  { value: "warehouse", label: "Sklad" },
  { value: "pump", label: "Nasos" },
  { value: "compressor", label: "Kompressor" },
  { value: "generator", label: "Generator" },
] as const;

function EquipmentProperties({ eq }: { eq: Equipment }) {
  const { updateEquipment, deleteEquipment, duplicateEquipment } = useEditorStore();

  const updatePos = (axis: 0 | 1 | 2, val: string) => {
    const n = parseFloat(val) || 0;
    const pos: [number, number, number] = [...eq.position];
    pos[axis] = n;
    updateEquipment(eq.id, { position: pos });
  };

  const updateRot = (axis: 0 | 1 | 2, val: string) => {
    const n = parseFloat(val) || 0;
    const rot: [number, number, number] = [...eq.rotation];
    rot[axis] = n;
    updateEquipment(eq.id, { rotation: rot });
  };

  const addParam = () => {
    const newParam: ParameterConfig = {
      key: `param_${Date.now()}`,
      label: "Yangi parametr",
      unit: "",
      min: 0,
      max: 100,
      critical: 90,
      source: "erpnext",
    };
    updateEquipment(eq.id, { parameters: [...eq.parameters, newParam] });
  };

  const updateParam = (idx: number, updates: Partial<ParameterConfig>) => {
    const params = eq.parameters.map((p, i) => (i === idx ? { ...p, ...updates } : p));
    updateEquipment(eq.id, { parameters: params });
  };

  const removeParam = (idx: number) => {
    updateEquipment(eq.id, { parameters: eq.parameters.filter((_, i) => i !== idx) });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm">{eq.id}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => duplicateEquipment(eq.id)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={() => deleteEquipment(eq.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Basic */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Asosiy</h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Nomi</Label>
          <Input
            className="h-8 text-xs"
            value={eq.label}
            onChange={(e) => updateEquipment(eq.id, { label: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Turi</Label>
          <Select
            value={eq.type}
            onValueChange={(v) => updateEquipment(eq.id, { type: v as Equipment["type"] })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EQUIPMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rang</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={eq.color || "#4a9eff"}
              onChange={(e) => updateEquipment(eq.id, { color: e.target.value })}
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <Input
              className="h-8 text-xs flex-1"
              value={eq.color || ""}
              onChange={(e) => updateEquipment(eq.id, { color: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Transform */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">Transform</h4>
        <div className="grid grid-cols-3 gap-2">
          {(["X", "Y", "Z"] as const).map((axis, i) => (
            <div key={axis} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{axis}</Label>
              <Input
                type="number"
                step="0.5"
                className="h-7 text-xs"
                value={eq.position[i as 0 | 1 | 2]}
                onChange={(e) => updatePos(i as 0 | 1 | 2, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {(["RX", "RY", "RZ"] as const).map((axis, i) => (
            <div key={axis} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">{axis}°</Label>
              <Input
                type="number"
                step="15"
                className="h-7 text-xs"
                value={eq.rotation[i as 0 | 1 | 2]}
                onChange={(e) => updateRot(i as 0 | 1 | 2, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">O'lcham</Label>
          <Input
            type="number"
            step="0.1"
            min="0.1"
            className="h-8 text-xs"
            value={eq.scale}
            onChange={(e) => updateEquipment(eq.id, { scale: parseFloat(e.target.value) || 1 })}
          />
        </div>
      </div>

      <Separator />

      {/* ERPNext Links */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase">ERPNext</h4>
        <div className="space-y-1.5">
          <Label className="text-xs">Workstation</Label>
          <Input
            className="h-8 text-xs"
            value={eq.linkedWorkstation || ""}
            placeholder="masalan: Qozon-1"
            onChange={(e) => updateEquipment(eq.id, { linkedWorkstation: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Warehouse</Label>
          <Input
            className="h-8 text-xs"
            value={eq.linkedWarehouse || ""}
            placeholder="masalan: Tayyor mahsulot skladi"
            onChange={(e) => updateEquipment(eq.id, { linkedWarehouse: e.target.value || undefined })}
          />
        </div>
      </div>

      <Separator />

      {/* Parameters */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase">Parametrlar</h4>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addParam}>
            <Plus className="h-3 w-3 mr-1" />
            Qo'shish
          </Button>
        </div>
        {eq.parameters.map((param, idx) => (
          <div key={param.key} className="rounded border p-2 space-y-1.5 relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5"
              onClick={() => removeParam(idx)}
            >
              <X className="h-3 w-3" />
            </Button>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <Label className="text-[10px]">Nomi</Label>
                <Input
                  className="h-6 text-[11px]"
                  value={param.label}
                  onChange={(e) => updateParam(idx, { label: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-[10px]">Birlik</Label>
                <Input
                  className="h-6 text-[11px]"
                  value={param.unit}
                  onChange={(e) => updateParam(idx, { unit: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <Label className="text-[10px]">Min</Label>
                <Input
                  type="number"
                  className="h-6 text-[11px]"
                  value={param.min}
                  onChange={(e) => updateParam(idx, { min: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-[10px]">Max</Label>
                <Input
                  type="number"
                  className="h-6 text-[11px]"
                  value={param.max}
                  onChange={(e) => updateParam(idx, { max: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-[10px]">Kritik</Label>
                <Input
                  type="number"
                  className="h-6 text-[11px]"
                  value={param.critical}
                  onChange={(e) => updateParam(idx, { critical: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipeProperties({ pipeId }: { pipeId: string }) {
  const { pipes, equipment, deletePipe, updatePipe } = useEditorStore();
  const pipe = pipes.find((p) => p.id === pipeId);
  if (!pipe) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="font-mono font-bold text-sm">{pipe.id}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={() => deletePipe(pipe.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Boshlanish</Label>
          <Select value={pipe.from} onValueChange={(v) => updatePipe(pipe.id, { from: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.id} — {eq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tugash</Label>
          <Select value={pipe.to} onValueChange={(v) => updatePipe(pipe.id, { to: v })}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {equipment.map((eq) => (
                <SelectItem key={eq.id} value={eq.id}>
                  {eq.id} — {eq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rang</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={pipe.color || "#888888"}
              onChange={(e) => updatePipe(pipe.id, { color: e.target.value })}
              className="h-8 w-8 rounded border cursor-pointer"
            />
            <Input
              className="h-8 text-xs flex-1"
              value={pipe.color || "#888888"}
              onChange={(e) => updatePipe(pipe.id, { color: e.target.value })}
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Radius</Label>
          <Input
            type="number"
            step="0.01"
            min="0.02"
            className="h-8 text-xs"
            value={pipe.radius ?? 0.08}
            onChange={(e) => updatePipe(pipe.id, { radius: parseFloat(e.target.value) || 0.08 })}
          />
        </div>
        <p className="text-[10px] text-muted-foreground">{pipe.waypoints.length} ta oraliq nuqta</p>
      </div>
    </div>
  );
}

export function PropertyPanel() {
  const { selectedIds, equipment, pipes } = useEditorStore();

  if (selectedIds.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground text-center">
          Uskunani tanlang xususiyatlarni ko'rish uchun
        </p>
      </div>
    );
  }

  const selectedId = selectedIds[0];

  // Check if it's a pipe
  const pipe = pipes.find((p) => p.id === selectedId);
  if (pipe) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3">
          <PipeProperties pipeId={selectedId} />
        </div>
      </ScrollArea>
    );
  }

  // Equipment
  const eq = equipment.find((e) => e.id === selectedId);
  if (!eq) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-muted-foreground">Element topilmadi</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <EquipmentProperties eq={eq} />
      </div>
    </ScrollArea>
  );
}
