"use client";

import { useState, useCallback } from "react";
import { Plus, Trash2, GripVertical, ArrowDown, Link2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useEditorStore } from "@/stores/editor-store";
import { LINE_TEMPLATES } from "@/lib/editor/production-line-templates";
import { findCatalogItem } from "@/lib/editor/equipment-catalog";
import type { Equipment } from "@/types/factory-twin";
import type { ProductionLineTemplate } from "@/types/editor";

const STAGE_SPACING_Z = 5; // 5m between stages

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

export function ProductionLineDesigner() {
  const {
    productionLines,
    equipment,
    createProductionLine,
    updateProductionLine,
    deleteProductionLine,
  } = useEditorStore();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    if (!newName.trim()) return;
    createProductionLine(newName.trim(), []);
    setNewName("");
  };

  const handleApplyTemplate = useCallback((template: ProductionLineTemplate) => {
    const currentEquipment = [...useEditorStore.getState().equipment];
    const newEquipmentIds: string[] = [];
    const newEquipment: Equipment[] = [];

    // Place equipment in a vertical row starting from Z = -20
    const startZ = -20;
    const startX = currentEquipment.length > 0 ? 15 : 0; // offset right if factory has existing eq

    for (let i = 0; i < template.stages.length; i++) {
      const stage = template.stages[i];
      const catalogItem = findCatalogItem(stage.subtype);
      if (!catalogItem) continue;

      const id = generateId(catalogItem.idPrefix, [...currentEquipment, ...newEquipment]);
      const z = startZ + i * STAGE_SPACING_Z;

      const eq: Equipment = {
        id,
        type: catalogItem.type,
        position: [startX, 0, z],
        rotation: [0, 0, 0],
        scale: catalogItem.defaultScale,
        label: stage.label,
        color: catalogItem.defaultColor,
        parameters: [...catalogItem.defaultParams],
      };

      newEquipment.push(eq);
      newEquipmentIds.push(id);
    }

    // Add all equipment
    const allEquipment = [...currentEquipment, ...newEquipment];

    // Create pipes between consecutive stages
    const currentPipes = [...useEditorStore.getState().pipes];
    const newPipes = [...currentPipes];

    for (let i = 0; i < newEquipmentIds.length - 1; i++) {
      const fromId = newEquipmentIds[i];
      const toId = newEquipmentIds[i + 1];
      const pipeId = `pipe-${fromId}-${toId}`.replace(/[^a-zA-Z0-9-]/g, "");

      const fromEq = newEquipment.find((e) => e.id === fromId);
      const toEq = newEquipment.find((e) => e.id === toId);
      if (!fromEq || !toEq) continue;

      const midZ = (fromEq.position[2] + toEq.position[2]) / 2;
      newPipes.push({
        id: pipeId,
        from: fromId,
        to: toId,
        waypoints: [[fromEq.position[0], 0.5, midZ]],
      });
    }

    // Create the production line
    const lineId = `line-${Date.now()}`;
    const currentLines = useEditorStore.getState().productionLines;

    useEditorStore.setState({
      equipment: allEquipment,
      pipes: newPipes,
      productionLines: [
        ...currentLines,
        { id: lineId, name: template.name, stages: newEquipmentIds },
      ],
      selectedIds: newEquipmentIds,
      isDirty: true,
    });
  }, []);

  const addStage = (lineId: string, eqId: string) => {
    const line = productionLines.find((l) => l.id === lineId);
    if (!line || line.stages.includes(eqId)) return;
    updateProductionLine(lineId, { stages: [...line.stages, eqId] });
  };

  const removeStage = (lineId: string, idx: number) => {
    const line = productionLines.find((l) => l.id === lineId);
    if (!line) return;
    updateProductionLine(lineId, { stages: line.stages.filter((_, i) => i !== idx) });
  };

  const moveStage = (lineId: string, from: number, to: number) => {
    const line = productionLines.find((l) => l.id === lineId);
    if (!line || to < 0 || to >= line.stages.length) return;
    const stages = [...line.stages];
    const [item] = stages.splice(from, 1);
    stages.splice(to, 0, item);
    updateProductionLine(lineId, { stages });
  };

  const autoLinkPipes = (lineId: string) => {
    const line = productionLines.find((l) => l.id === lineId);
    if (!line || line.stages.length < 2) return;
    const { pipes: currentPipes } = useEditorStore.getState();
    const newPipes = [...currentPipes];

    for (let i = 0; i < line.stages.length - 1; i++) {
      const from = line.stages[i];
      const to = line.stages[i + 1];
      const pipeId = `pipe-${from}-${to}`.replace(/[^a-zA-Z0-9-]/g, "");
      if (newPipes.some((p) => p.id === pipeId)) continue;

      const fromEq = equipment.find((e) => e.id === from);
      const toEq = equipment.find((e) => e.id === to);
      if (!fromEq || !toEq) continue;

      const midZ = (fromEq.position[2] + toEq.position[2]) / 2;
      newPipes.push({
        id: pipeId,
        from,
        to,
        waypoints: [[fromEq.position[0], 0.5, midZ]],
      });
    }

    useEditorStore.setState({ pipes: newPipes, isDirty: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          Liniya loyihalash
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ishlab chiqarish liniyalari</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Templates section */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Tayyor shablonlar
            </h4>
            <div className="grid gap-2">
              {LINE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center justify-between rounded-lg border p-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{tpl.name}</span>
                      <Badge variant="secondary" className="text-[10px] h-4">
                        {tpl.stages.length} bosqich
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 pl-5.5 truncate">
                      {tpl.description}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs shrink-0 ml-2"
                    onClick={() => handleApplyTemplate(tpl)}
                  >
                    Qo&apos;llash
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Manual creation */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
              Qo&apos;lda yaratish
            </h4>
            <div className="flex gap-2">
              <Input
                className="h-8 text-xs flex-1"
                placeholder="Yangi liniya nomi..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleCreate}
                disabled={!newName.trim()}
              >
                <Plus className="h-3 w-3 mr-1" />
                Yaratish
              </Button>
            </div>
          </div>

          {/* Existing lines */}
          {productionLines.length > 0 && <Separator />}
          {productionLines.map((line) => (
            <div key={line.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{line.name}</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => autoLinkPipes(line.id)}
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Avto-ulash
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => deleteProductionLine(line.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Stages */}
              <div className="space-y-1">
                {line.stages.map((stageId, idx) => {
                  const eq = equipment.find((e) => e.id === stageId);
                  return (
                    <div key={`${stageId}-${idx}`}>
                      <div className="flex items-center gap-1.5 text-xs">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-mono">{stageId}</span>
                        <span className="text-muted-foreground truncate">— {eq?.label || "?"}</span>
                        <div className="ml-auto flex gap-0.5 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={idx === 0}
                            onClick={() => moveStage(line.id, idx, idx - 1)}
                          >
                            <ArrowDown className="h-2.5 w-2.5 rotate-180" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            disabled={idx === line.stages.length - 1}
                            onClick={() => moveStage(line.id, idx, idx + 1)}
                          >
                            <ArrowDown className="h-2.5 w-2.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive"
                            onClick={() => removeStage(line.id, idx)}
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add stage */}
              <Select onValueChange={(v) => addStage(line.id, v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="+ Bosqich qo'shish" />
                </SelectTrigger>
                <SelectContent>
                  {equipment
                    .filter((e) => !line.stages.includes(e.id))
                    .map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.id} — {eq.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
