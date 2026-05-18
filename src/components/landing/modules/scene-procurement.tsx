import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface SceneProcurementProps {
  progress: number;
}

export function SceneProcurement({ progress }: SceneProcurementProps) {
  const orders = [
    { vendor: "ООО Сахар Поставка", amount: 25000000, status: "pending", threshold: 0 },
    { vendor: "ЗАО Упаковка Pro", amount: 8500000, status: "pending", threshold: 25 },
    { vendor: "ООО Агро Импорт", amount: 42000000, status: "pending", threshold: 50 },
  ];

  const landedCostBreakdown = [
    { label: "Товар", percent: 70, color: "from-blue-500 to-blue-400" },
    { label: "Фрахт", percent: 20, color: "from-amber-500 to-amber-400" },
    { label: "Пошлина", percent: 10, color: "from-orange-500 to-orange-400" },
  ];

  const animatedPercent = Math.min(progress, 100) * (100 / 100);

  return (
    <div className="space-y-6">
      {/* Purchase orders */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isVisible = progress >= order.threshold;

          return (
            <motion.div
              key={order.vendor}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/30"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">{order.vendor}</p>
                <p className="text-xs text-slate-400">{(order.amount / 1000000).toFixed(1)}M сўм</p>
              </div>
              <div className="px-3 py-1 rounded text-xs font-medium text-amber-400 bg-amber-900/20">
                Ожидание
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Landed cost breakdown */}
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Структура стоимости</p>
        <div className="space-y-2">
          {landedCostBreakdown.map((item) => (
            <motion.div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-xs font-medium text-slate-100">
                  {Math.round((animatedPercent / 100) * item.percent)}%
                </p>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${item.color}`}
                  animate={{ width: `${(animatedPercent / 100) * item.percent}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Auto-replenishment alert */}
      {progress >= 65 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-lg border border-red-700 bg-red-900/20"
        >
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">
            <span className="font-medium">2 товара</span> ниже минимального остатка
          </p>
        </motion.div>
      )}
    </div>
  );
}
