"use client";

import { useEffect } from "react";
import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import { togglePlayback, seekTo } from "@/lib/playback/playback-engine";

export function useFactoryShortcuts() {
  const store = useFactoryTwinStore;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const state = store.getState();

      switch (e.key) {
        // View mode
        case "v":
        case "V":
          state.setViewMode(state.viewMode === "3d" ? "2d" : "3d");
          break;

        // Layers
        case "p":
        case "P":
          state.togglePipes();
          break;
        case "o":
        case "O":
          state.toggleFlow();
          break;
        case "l":
        case "L":
          state.toggleLabels();
          break;
        case "g":
        case "G":
          state.toggleGrid();
          break;

        // Playback
        case " ":
          if (state.mode === "playback") {
            e.preventDefault();
            togglePlayback();
          }
          break;
        case "ArrowLeft":
          if (state.mode === "playback") {
            e.preventDefault();
            const delta = e.shiftKey ? 60000 : 10000;
            seekTo(Math.max(state.timelineStart, state.currentTime - delta));
          }
          break;
        case "ArrowRight":
          if (state.mode === "playback") {
            e.preventDefault();
            const delta = e.shiftKey ? 60000 : 10000;
            seekTo(Math.min(state.timelineEnd, state.currentTime + delta));
          }
          break;
        case "m":
        case "M":
          state.setMode(state.mode === "live" ? "playback" : "live");
          break;

        // Deselect
        case "Escape":
          state.setSelectedEquipment(null);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
