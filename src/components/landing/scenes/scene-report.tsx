"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SceneReportProps {
  sceneMs: number;
}

export function SceneReport({ sceneMs }: SceneReportProps) {
  const formatNumber = (n: number) => {
    return n.toLocaleString("ru-RU");
  };

  const rows = [
    {
      label: "Выручка",
      value: 12500000,
      showAt: 0,
    },
    {
      label: "Себестоимость",
      value: -7800000,
      showAt: 800,
    },
    {
      label: "Валовая прибыль",
      value: 4700000,
      showAt: 1600,
      highlight: true,
    },
  ];

  return (
    <div className="space-y-4 p-6">
      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
        className="text-lg font-semibold text-white"
      >
        Отчёт П&amp;Л
      </motion.h2>

      <div className="space-y-3 border-t border-slate-700 pt-4">
        <AnimatePresence mode="wait">
          {rows.map((row) => {
            const isVisible = sceneMs >= row.showAt;

            return isVisible ? (
              <motion.div
                key={row.label}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className={`flex items-center justify-between rounded px-3 py-2 ${
                  row.highlight ? "bg-green-500/10" : "bg-slate-800/40"
                }`}
              >
                <span
                  className={`text-sm ${
                    row.highlight ? "font-semibold text-green-400" : "text-slate-300"
                  }`}
                >
                  {row.label}
                </span>
                <span
                  className={`font-mono text-sm font-bold ${
                    row.highlight ? "text-green-400" : "text-teal-400"
                  }`}
                >
                  {row.value >= 0 ? "+" : ""}
                  {formatNumber(row.value)}
                </span>
              </motion.div>
            ) : null;
          })}
        </AnimatePresence>
      </div>

      {/* Footer insight */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.8 }}
        className="border-t border-slate-700 pt-4 text-xs text-slate-400"
      >
        Прибыль на 38% выше среднего по рынку ✓
      </motion.p>
    </div>
  );
}
