"use client";

import { useScriptedTimeline } from "./use-scripted-timeline";
import { AppWindowDemo } from "./app-window-demo";

export function HeroDemo() {
  const { ms, reducedMotion } = useScriptedTimeline();

  return <AppWindowDemo ms={ms} reducedMotion={reducedMotion} />;
}
