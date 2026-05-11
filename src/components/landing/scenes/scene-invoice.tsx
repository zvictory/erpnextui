"use client";

import { motion, AnimatePresence } from "framer-motion";

interface SceneInvoiceProps {
  sceneMs: number;
}

export function SceneInvoice({ sceneMs }: SceneInvoiceProps) {
  const lineItems = [
    { name: "Мороженое «Ванильное»", qty: 50, rate: 25000 },
    { name: "Мороженое «Шоколадное»", qty: 30, rate: 28000 },
    { name: "Доставка", qty: 1, rate: 100000 },
  ];

  const total = lineItems.reduce((sum, item) => sum + item.qty * item.rate, 0);

  const formatNumber = (n: number) => {
    return n.toLocaleString("ru-RU");
  };

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 }}
      >
        <h2 className="text-lg font-semibold text-white">Счёт-фактура</h2>
        <p className="text-xs text-slate-400">
          Клиент: Anjan Мороженое • {new Date().toLocaleDateString("ru-RU")}
        </p>
      </motion.div>

      {/* Line items */}
      <div className="space-y-2 border-t border-slate-700 pt-4">
        <AnimatePresence mode="wait">
          {lineItems.map((item, i) => {
            const showAt = i * 800;
            const isVisible = sceneMs >= showAt;

            return isVisible ? (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-300">{item.name}</span>
                <span className="text-slate-400">
                  {item.qty} × {formatNumber(item.rate)}
                </span>
                <span className="ml-4 font-mono text-teal-400">
                  {formatNumber(item.qty * item.rate)}
                </span>
              </motion.div>
            ) : null;
          })}
        </AnimatePresence>
      </div>

      {/* Total */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5 }}
        className="border-t border-slate-700 pt-4 flex justify-between rounded-lg bg-slate-800 p-3"
      >
        <span className="font-semibold text-white">Итого</span>
        <span className="font-mono font-bold text-teal-400">
          {formatNumber(total)}
        </span>
      </motion.div>

      {/* Status badge */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3 }}
        className="flex justify-center pt-2"
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-400">
          <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
          Отправлено
        </span>
      </motion.div>
    </div>
  );
}
