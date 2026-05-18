import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

interface SceneFinanceProps {
  progress: number;
}

export function SceneFinance({ progress }: SceneFinanceProps) {
  const revenue = Math.floor((Math.min(progress, 60) / 60) * 12500000);
  const profit = Math.floor((Math.min(progress, 60) / 60) * 3100000);
  const liabilities = Math.floor((Math.min(progress, 60) / 60) * 2800000);

  const kpiCards = [
    { label: "Выручка", value: revenue, icon: TrendingUp, color: "teal", threshold: 20 },
    { label: "Прибыль", value: profit, icon: TrendingUp, color: "green", threshold: 40 },
    {
      label: "Кредиторка",
      value: liabilities,
      icon: TrendingUp,
      color: "amber",
      threshold: 60,
    },
  ];

  const chartBars = [40, 55, 72, 85, 92, 78];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        {kpiCards.map((card, i) => {
          const isVisible = progress >= card.threshold;
          const colorClass = {
            teal: "text-teal-400 bg-teal-900/20",
            green: "text-green-400 bg-green-900/20",
            amber: "text-amber-400 bg-amber-900/20",
          }[card.color];

          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
              className={`rounded-lg border border-slate-700 p-4 ${colorClass}`}
            >
              <p className="text-sm text-slate-400 mb-2">{card.label}</p>
              <p className="text-2xl font-bold">{(card.value / 1000000).toFixed(1)}M</p>
            </motion.div>
          );
        })}
      </div>

      {/* Cashflow chart */}
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Кассовый поток</p>
        <div className="flex items-end gap-2 h-32 bg-slate-900/30 rounded p-4">
          {chartBars.map((baseHeight, i) => {
            const animatedHeight = Math.min(progress, 100) * (baseHeight / 100);
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t"
                style={{ height: `${animatedHeight}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Multi-currency badge */}
      {progress >= 50 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-800/50 w-fit mx-auto"
        >
          <span className="text-sm text-slate-300">
            <span className="text-teal-400">$42 800</span>
            {" / "}
            <span className="text-slate-100">530 000 000 сўм</span>
          </span>
        </motion.div>
      )}
    </div>
  );
}
