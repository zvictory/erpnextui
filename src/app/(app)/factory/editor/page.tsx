"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Home,
  Save,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Grid3X3,
  Magnet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useEditorStore } from "@/stores/editor-store";
import { EditorToolbar } from "@/components/oee-dashboard/editor/EditorToolbar";
import { EquipmentCatalog } from "@/components/oee-dashboard/editor/EquipmentCatalog";
import { PropertyPanel } from "@/components/oee-dashboard/editor/PropertyPanel";
import { ProductionLineDesigner } from "@/components/oee-dashboard/editor/ProductionLineDesigner";
import { useEditorShortcuts } from "@/hooks/use-editor-shortcuts";
import {
  serializeLayout,
  saveToLocalStorage,
  loadFromLocalStorage,
  downloadJson,
  deserializeLayout,
} from "@/lib/editor/layout-serializer";
import { validateLayout } from "@/lib/editor/layout-validator";
import { cn } from "@/lib/utils";

const EditorCanvas = dynamic(
  () => import("@/components/oee-dashboard/editor/EditorCanvas").then((m) => ({ default: m.EditorCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-neutral-100 dark:bg-neutral-900 text-muted-foreground text-sm">
        Loading editor...
      </div>
    ),
  },
);

export default function FactoryEditorPage() {
  useEditorShortcuts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationOpen, setValidationOpen] = useState(false);

  const {
    equipment,
    pipes,
    productionLines,
    isDirty,
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnap,
    loadLayout,
    resetToFactory,
    markClean,
  } = useEditorStore();

  // Autosave every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const s = useEditorStore.getState();
      if (s.isDirty) {
        const layout = serializeLayout(s.equipment, s.pipes, s.productionLines);
        saveToLocalStorage(layout);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load autosaved layout on mount
  useEffect(() => {
    const saved = loadFromLocalStorage();
    if (saved) {
      loadLayout(saved.equipment, saved.pipes, saved.productionLines || []);
    }
  }, [loadLayout]);

  const handleSave = () => {
    const layout = serializeLayout(equipment, pipes, productionLines);
    saveToLocalStorage(layout);
    markClean();
    toast.success("Layout saqlandi");
  };

  const handleExport = () => {
    const layout = serializeLayout(equipment, pipes, productionLines);
    downloadJson(layout);
    toast.success("JSON yuklab olindi");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = ev.target?.result as string;
        const layout = deserializeLayout(json);
        loadLayout(layout.equipment, layout.pipes, layout.productionLines || []);
        toast.success(`"${layout.name}" yuklandi`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import xatolik");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (isDirty && !confirm("Saqlanmagan o'zgarishlar yo'qoladi. Davom etasizmi?")) return;
    resetToFactory();
    toast.info("Zavod layouti qayta yuklandi");
  };

  const validation = validateLayout(equipment, pipes, productionLines);

  return (
    <TooltipProvider>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b px-3 py-1.5 bg-background/95 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/factory">
                <Home className="h-3.5 w-3.5 mr-1" />
                Zavod
              </Link>
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <span className="text-sm font-medium">Layout Editor</span>
            {isDirty && (
              <Badge variant="secondary" className="text-[10px] h-5">
                Saqlanmagan
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <EditorToolbar />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={showGrid ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={toggleGrid}
              title="Grid"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={snapToGrid ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8"
              onClick={toggleSnap}
              title="Snap"
            >
              <Magnet className="h-4 w-4" />
            </Button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <ProductionLineDesigner />

            {/* Validation */}
            <Dialog open={validationOpen} onOpenChange={setValidationOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    !validation.valid && "text-destructive",
                  )}
                >
                  {validation.valid ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  )}
                  {validation.errors.length + validation.warnings.length}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Validatsiya</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {validation.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {e.message}
                    </div>
                  ))}
                  {validation.warnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-yellow-600">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {w.message}
                    </div>
                  ))}
                  {validation.errors.length === 0 && validation.warnings.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      Muammolar topilmadi
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            <Separator orientation="vertical" className="h-5 mx-1" />

            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleReset} title="Reset">
              <RotateCcw className="h-4 w-4" />
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              title="Import"
            >
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleExport} title="Export">
              <Download className="h-4 w-4" />
            </Button>
            <Button size="sm" className="h-8 text-xs" onClick={handleSave}>
              <Save className="h-3.5 w-3.5 mr-1" />
              Saqlash
            </Button>
          </div>
        </div>

        {/* Main content: Catalog | Canvas | Properties */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left panel — Equipment catalog */}
          <div className="w-48 border-r bg-background/80 flex-shrink-0">
            <EquipmentCatalog />
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 relative">
            <EditorCanvas />

            {/* Bottom info */}
            <div className="absolute bottom-2 left-2 z-10">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-[10px]">
                {equipment.length} uskuna · {pipes.length} quvur
              </Badge>
            </div>
          </div>

          {/* Right panel — Properties */}
          <div className="w-64 border-l bg-background/80 flex-shrink-0">
            <PropertyPanel />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
