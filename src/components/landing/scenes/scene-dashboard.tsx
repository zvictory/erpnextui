"use client";

import { motion } from "framer-motion";

interface SceneDashboardProps {
  sceneMs: number;
}

export function SceneDashboard({ sceneMs }: SceneDashboardProps) {
  // Count up animations based on time through the scene
  const revenue = Math.floor((sceneMs / 5000) * 1250000);
  const profit = Math.floor((sceneMs / 5000) * 312000);
  const payable = Math.floor((sceneMs / 5000) * 580000);

  const formatNumber = (n: number) => {
    return n.toLocaleString("ru-RU");
  };

  return (
    <div className="space-y-6 p-6">
      <h2 className="text-lg font-semibold text-white">Дашборд</h2>

      <div className="grid grid-cols-3 gap-4">
        {/* Выручка */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-slate-800 p-4"
        >
          <p className="text-xs text-slate-400">Выручка</p>
          <p className="mt-2 font-mono text-sm font-bold text-teal-400">
            {formatNumber(revenue)}
          </p>
        </motion.div>

        {/* Прибыль */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg bg-slate-800 p-4"
        >
          <p className="text-xs text-slate-400">Прибыль</p>
          <p className="mt-2 font-mono text-sm font-bold text-green-400">
            {formatNumber(profit)}
          </p>
        </motion.div>

        {/* Кредиторка */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-lg bg-slate-800 p-4"
        >
          <p className="text-xs text-slate-400">Кредиторка</p>
          <p className="mt-2 font-mono text-sm font-bold text-orange-400">
            {formatNumber(payable)}
          </p>
        </motion.div>
      </div>

      {/* Sparkline placeholder */}
      <div className="rounded-lg bg-slate-800 p-4">
        <p className="mb-3 text-xs text-slate-400">Тренд</p>
        <div className="flex items-end gap-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const bars = [30, 45, 35, 50, 55, 48, 60, 65, 58, 70, 75, 80];
            const height = bars[i] || 40;
            const alpha = Math.min(sceneMs / 5000, 1);
            const displayHeight = height * alpha;

            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-teal-500/40"
                style={{
                  height: `${displayHeight}px`,
                  minHeight: "4px",
                  transition: "height 0.05s linear",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
