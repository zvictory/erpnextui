"use client";

import {
  MousePointer2,
  Move,
  RotateCw,
  Scaling,
  GitBranch,
  Trash2,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorStore } from "@/stores/editor-store";
import type { EditorTool } from "@/types/editor";
import { cn } from "@/lib/utils";

const TOOLS: { tool: EditorTool; icon: typeof MousePointer2; label: string; shortcut: string }[] = [
  { tool: "select", icon: MousePointer2, label: "Tanlash", shortcut: "V" },
  { tool: "move", icon: Move, label: "Ko'chirish", shortcut: "G" },
  { tool: "rotate", icon: RotateCw, label: "Aylantirish", shortcut: "R" },
  { tool: "scale", icon: Scaling, label: "O'lcham", shortcut: "S" },
  { tool: "pipe", icon: GitBranch, label: "Quvur chizish", shortcut: "P" },
  { tool: "delete", icon: Trash2, label: "O'chirish", shortcut: "Del" },
];

export function EditorToolbar() {
  const { activeTool, setTool } = useEditorStore();

  const handleUndo = () => useEditorStore.temporal.getState().undo();
  const handleRedo = () => useEditorStore.temporal.getState().redo();

  return (
    <div className="flex items-center gap-1 rounded-lg border bg-background/90 backdrop-blur-sm px-2 py-1 shadow-sm">
      {TOOLS.map(({ tool, icon: Icon, label, shortcut }) => (
        <Tooltip key={tool}>
          <TooltipTrigger asChild>
            <Button
              variant={activeTool === tool ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", activeTool === tool && "shadow-sm")}
              onClick={() => setTool(tool)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {label} ({shortcut})
          </TooltipContent>
        </Tooltip>
      ))}

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleUndo}>
            <Undo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Qaytarish (Ctrl+Z)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRedo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Takrorlash (Ctrl+Shift+Z)</TooltipContent>
      </Tooltip>
    </div>
  );
}
