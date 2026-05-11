"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LOOP_MS } from "./demo-script";

let reducedMotionSubscribers: Set<() => void> = new Set();
let currentReducedMotion = false;

function subscribeReducedMotion(callback: () => void) {
  reducedMotionSubscribers.add(callback);
  return () => {
    reducedMotionSubscribers.delete(callback);
  };
}

function getReducedMotionSnapshot() {
  return currentReducedMotion;
}

function getReducedMotionServerSnapshot() {
  return false;
}

function notifyReducedMotionSubscribers() {
  reducedMotionSubscribers.forEach((cb) => cb());
}

if (typeof window !== "undefined") {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  currentReducedMotion = mediaQuery.matches;

  const handleChange = (e: MediaQueryListEvent) => {
    currentReducedMotion = e.matches;
    notifyReducedMotionSubscribers();
  };

  mediaQuery.addEventListener("change", handleChange);
}

export function useScriptedTimeline() {
  const [ms, setMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot
  );

  const tick = (now: number) => {
    if (startedAtRef.current === null) startedAtRef.current = now;
    const elapsed = (now - startedAtRef.current) % LOOP_MS;
    setMs(elapsed);
    rafRef.current = requestAnimationFrame(tick);
  };

  const onVisibility = () => {
    if (document.hidden) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      startedAtRef.current = null;
    } else if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(tick);
    }
  };

  useEffect(() => {
    if (reducedMotion) {
      setMs(8000);
      return;
    }

    rafRef.current = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  const displayMs = reducedMotion ? 8000 : ms;

  return { ms: displayMs, reducedMotion };
}
