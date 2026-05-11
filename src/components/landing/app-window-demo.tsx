"use client";

import { motion, AnimatePresence } from "framer-motion";
import { sceneAt, SIDEBAR_NAV, URL_PER_SCENE } from "./demo-script";
import { SceneDashboard } from "./scenes/scene-dashboard";
import { SceneInvoice } from "./scenes/scene-invoice";
import { SceneReport } from "./scenes/scene-report";

interface AppWindowDemoProps {
  ms: number;
  reducedMotion: boolean;
}

export function AppWindowDemo({ ms, reducedMotion }: AppWindowDemoProps) {
  const currentScene = sceneAt(ms);

  // Compute ms since the scene started
  const sceneStartMs = {
    dashboard: 0,
    invoice: 5000,
    report: 11000,
  }[currentScene];

  const sceneMs = ms - sceneStartMs;
  const url = URL_PER_SCENE[currentScene];

  // Find active nav item
  const activeIndex = {
    dashboard: 0,
    invoice: 1,
    report: 2,
  }[currentScene];

  return (
    <div className="flex h-96 w-full max-w-md flex-col overflow-hidden rounded-lg border border-slate-700 bg-slate-950 shadow-2xl">
      {/* Chrome header */}
      <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-900 px-4 py-3">
        {/* Traffic lights */}
        <div className="flex gap-2">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>

        {/* URL bar */}
        <div className="ml-4 flex-1">
          <div className="rounded bg-slate-800 px-3 py-1.5 text-center text-xs text-slate-400">
            {url}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="hidden w-32 border-r border-slate-700 bg-slate-900 py-4 sm:block">
          {SIDEBAR_NAV.map((item, i) => (
            <motion.button
              key={item.label}
              onClick={() => {}}
              className={`block w-full px-3 py-2 text-left text-xs transition-colors ${
                i === activeIndex
                  ? "border-l-2 border-teal-500 bg-slate-800 font-medium text-teal-400"
                  : "border-l-2 border-transparent text-slate-400 hover:bg-slate-800"
              }`}
              animate={{
                backgroundColor: i === activeIndex ? "rgb(30, 41, 59)" : "transparent",
              }}
              transition={{ duration: 0.2 }}
            >
              {item.label}
            </motion.button>
          ))}
        </div>

        {/* Content area with scene switching */}
        <div className="flex-1 overflow-hidden bg-slate-950">
          <AnimatePresence mode="wait">
            {!reducedMotion ? (
              <motion.div
                key={currentScene}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                {currentScene === "dashboard" && <SceneDashboard sceneMs={sceneMs} />}
                {currentScene === "invoice" && <SceneInvoice sceneMs={sceneMs} />}
                {currentScene === "report" && <SceneReport sceneMs={sceneMs} />}
              </motion.div>
            ) : (
              <div className="h-full">
                <SceneInvoice sceneMs={6000} />
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
