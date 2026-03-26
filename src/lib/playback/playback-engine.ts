import { useFactoryTwinStore } from "@/stores/factory-twin-store";
import { buildSnapshot } from "./snapshot-builder";

let rafId: number | null = null;
let lastFrameTime = 0;

/**
 * Start the playback loop using requestAnimationFrame.
 * Advances currentTime in the store and rebuilds snapshots.
 */
export function startPlayback() {
  if (rafId !== null) return; // already running

  lastFrameTime = performance.now();
  const store = useFactoryTwinStore.getState();
  store.setPlaying(true);

  function tick(now: number) {
    const state = useFactoryTwinStore.getState();
    if (!state.isPlaying || state.mode !== "playback") {
      rafId = null;
      return;
    }

    const deltaMs = now - lastFrameTime;
    lastFrameTime = now;

    // Advance time
    state.advanceTime(deltaMs);

    // Rebuild snapshot at new time
    const snapshot = buildSnapshot(state.events, state.currentTime);
    state.setSnapshot(snapshot);

    rafId = requestAnimationFrame(tick);
  }

  rafId = requestAnimationFrame(tick);
}

/** Pause playback */
export function pausePlayback() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  useFactoryTwinStore.getState().setPlaying(false);
}

/** Seek to a specific time and update snapshot */
export function seekTo(time: number) {
  const store = useFactoryTwinStore.getState();
  store.seek(time);
  const snapshot = buildSnapshot(store.events, time);
  store.setSnapshot(snapshot);
}

/** Toggle play/pause */
export function togglePlayback() {
  const { isPlaying } = useFactoryTwinStore.getState();
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}
