"use client";

import { useState } from "react";
import { Plus, Trash2, GripVertical, ArrowDown, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useEditorStore } from "@/stores/editor-store";

export function ProductionLineDesigner() {
  const {
    productionLines,
    equipment,
    pipes,
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ishlab chiqarish liniyalari</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create new */}
          <div className="flex gap-2">
            <Input
              className="h-8 text-xs flex-1"
              placeholder="Yangi liniya nomi..."
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <Button size="sm" className="h-8 text-xs" onClick={handleCreate} disabled={!newName.trim()}>
              <Plus className="h-3 w-3 mr-1" />
              Yaratish
            </Button>
          </div>

          {/* Existing lines */}
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
                        <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                        <span className="text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-mono">{stageId}</span>
                        <span className="text-muted-foreground">— {eq?.label || "?"}</span>
                        <div className="ml-auto flex gap-0.5">
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

          {productionLines.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Hali liniya yaratilmagan
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
