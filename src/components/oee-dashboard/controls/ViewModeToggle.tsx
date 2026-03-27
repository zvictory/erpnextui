"use client";

import { Monitor, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";

export function ViewModeToggle() {
  const { viewMode, setViewMode } = useFactoryTwinStore();

  return (
    <div className="flex gap-0.5 bg-black/60 backdrop-blur-sm rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 text-xs gap-1 rounded-md ${
          viewMode === "3d"
            ? "bg-white/20 text-white hover:bg-white/30 hover:text-white"
            : "text-white/50 hover:text-white hover:bg-white/10"
        }`}
        onClick={() => setViewMode("3d")}
      >
        <Monitor className="h-3 w-3" />
        3D
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 text-xs gap-1 rounded-md ${
          viewMode === "2d"
            ? "bg-white/20 text-white hover:bg-white/30 hover:text-white"
            : "text-white/50 hover:text-white hover:bg-white/10"
        }`}
        onClick={() => setViewMode("2d")}
      >
        <Map className="h-3 w-3" />
        2D
      </Button>
    </div>
  );
}
