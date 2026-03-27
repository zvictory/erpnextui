import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import {
  serializeLayout,
  saveToLocalStorage,
  downloadJson,
} from "@/lib/editor/layout-serializer";
import { toast } from "sonner";

export function useEditorShortcuts() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Skip if typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const store = useEditorStore.getState();

      switch (e.key.toLowerCase()) {
        case "v":
          if (!ctrl) { store.setTool("select"); e.preventDefault(); }
          break;
        case "g":
          if (!ctrl) { store.setTool("move"); e.preventDefault(); }
          break;
        case "r":
          if (!ctrl) { store.setTool("rotate"); e.preventDefault(); }
          break;
        case "s":
          if (ctrl) {
            e.preventDefault();
            const layout = serializeLayout(store.equipment, store.pipes, store.productionLines);
            saveToLocalStorage(layout);
            store.markClean();
            toast.success("Layout saqlandi");
          } else {
            store.setTool("scale");
            e.preventDefault();
          }
          break;
        case "p":
          if (!ctrl) { store.setTool("pipe"); e.preventDefault(); }
          break;
        case "delete":
        case "backspace":
          if (store.activeTool === "pipe" && store.pipeDrawing.active) {
            // Remove last waypoint
            const wps = store.pipeDrawing.waypoints;
            if (wps.length > 0) {
              useEditorStore.setState({
                pipeDrawing: { ...store.pipeDrawing, waypoints: wps.slice(0, -1) },
              });
            } else {
              store.cancelPipeDrawing();
            }
          } else if (store.selectedIds.length > 0) {
            for (const id of store.selectedIds) {
              // Check if it's a pipe or equipment
              if (store.pipes.some((p) => p.id === id)) {
                store.deletePipe(id);
              } else {
                store.deleteEquipment(id);
              }
            }
          }
          e.preventDefault();
          break;
        case "escape":
          if (store.pipeDrawing.active) {
            store.cancelPipeDrawing();
          } else {
            store.clearSelection();
            store.setTool("select");
          }
          e.preventDefault();
          break;
        case "z":
          if (ctrl && shift) {
            useEditorStore.temporal.getState().redo();
            e.preventDefault();
          } else if (ctrl) {
            useEditorStore.temporal.getState().undo();
            e.preventDefault();
          }
          break;
        case "d":
          if (ctrl && store.selectedIds.length > 0) {
            e.preventDefault();
            store.duplicateEquipment(store.selectedIds[0]);
          }
          break;
        case "c":
          if (ctrl) { store.copySelected(); e.preventDefault(); }
          break;
        case "x":
          if (ctrl) {
            store.copySelected();
            for (const id of store.selectedIds) store.deleteEquipment(id);
            e.preventDefault();
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
