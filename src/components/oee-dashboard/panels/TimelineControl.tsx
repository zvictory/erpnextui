"use client";

import { useCallback } from "react";
import {
  SkipBack,
  Rewind,
  Play,
  Pause,
  FastForward,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import {
  startPlayback,
  pausePlayback,
  seekTo,
} from "@/lib/playback/playback-engine";

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function TimelineControl() {
  const {
    isPlaying,
    speed,
    timelineStart,
    timelineEnd,
    currentTime,
    events,
    setSpeed,
  } = useFactoryTwinStore();

  const duration = timelineEnd - timelineStart;
  const progress = duration > 0 ? ((currentTime - timelineStart) / duration) * 100 : 0;

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const pct = parseFloat(e.target.value);
      const time = timelineStart + (pct / 100) * duration;
      seekTo(time);
    },
    [timelineStart, duration],
  );

  const speeds = [1, 2, 5, 10];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-black/80 backdrop-blur-sm rounded-lg text-white text-xs select-none">
      {/* Transport controls */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
        onClick={() => seekTo(timelineStart)}
      >
        <SkipBack className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
        onClick={() => seekTo(Math.max(timelineStart, currentTime - 60000))}
      >
        <Rewind className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-white hover:text-white hover:bg-white/20"
        onClick={() => (isPlaying ? pausePlayback() : startPlayback())}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
        onClick={() => seekTo(Math.min(timelineEnd, currentTime + 60000))}
      >
        <FastForward className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-white hover:text-white hover:bg-white/20"
        onClick={() => seekTo(timelineEnd)}
      >
        <SkipForward className="h-3.5 w-3.5" />
      </Button>

      {/* Time display */}
      <span className="font-mono tabular-nums min-w-[64px] text-center">
        {formatTime(currentTime)}
      </span>

      {/* Timeline slider with event markers */}
      <div className="flex-1 relative mx-2">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={progress}
          onChange={handleSliderChange}
          className="w-full h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
        />
        {/* Event markers */}
        {events.map((event, i) => {
          const pct = duration > 0 ? ((event.timestamp - timelineStart) / duration) * 100 : 0;
          if (pct < 0 || pct > 100) return null;
          const color =
            event.type === "quality_fail"
              ? "#ef4444"
              : event.type === "manufacture"
                ? "#22c55e"
                : event.type === "transfer"
                  ? "#3b82f6"
                  : "#eab308";
          return (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none"
              style={{ left: `${pct}%`, background: color }}
            />
          );
        })}
      </div>

      {/* End time */}
      <span className="font-mono tabular-nums min-w-[64px] text-center opacity-60">
        {formatTime(timelineEnd)}
      </span>

      {/* Speed selector */}
      <div className="flex gap-0.5 ml-1">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              speed === s ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>

      {/* Event count */}
      <span className="opacity-50 ml-1">{events.length} events</span>
    </div>
  );
}
