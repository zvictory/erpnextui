"use client";

import { Radio, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import { pausePlayback } from "@/lib/playback/playback-engine";

export function PlaybackModeToggle() {
  const { mode, setMode } = useFactoryTwinStore();

  function handleSwitch(newMode: "live" | "playback") {
    if (newMode === mode) return;
    if (mode === "playback") pausePlayback();
    setMode(newMode);
  }

  return (
    <div className="flex gap-0.5 bg-black/60 backdrop-blur-sm rounded-lg p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 text-xs gap-1 rounded-md ${
          mode === "live"
            ? "bg-green-600 text-white hover:bg-green-700 hover:text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={() => handleSwitch("live")}
      >
        <Radio className="h-3 w-3" />
        Live
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 text-xs gap-1 rounded-md ${
          mode === "playback"
            ? "bg-blue-600 text-white hover:bg-blue-700 hover:text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        }`}
        onClick={() => handleSwitch("playback")}
      >
        <History className="h-3 w-3" />
        Playback
      </Button>
    </div>
  );
}
