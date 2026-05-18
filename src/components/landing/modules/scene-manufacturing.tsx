import { motion } from "framer-motion";
import { Clock, CheckCircle, Play } from "lucide-react";

interface SceneManufacturingProps {
  progress: number;
}

export function SceneManufacturing({ progress }: SceneManufacturingProps) {
  const orders = [
    { id: "ПЗ-0041", status: "planned", threshold: 0 },
    { id: "ПЗ-0042", status: "inprogress", threshold: 33 },
    { id: "ПЗ-0043", status: "done", threshold: 66 },
  ];

  const getStatusInfo = (baseStatus: string) => {
    if (progress < 33) return "planned";
    if (progress < 66) return "inprogress";
    return "done";
  };

  const statusConfig = {
    planned: { label: "Планируется", color: "text-slate-400 bg-slate-800", icon: Clock },
    inprogress: { label: "В производстве", color: "text-blue-400 bg-blue-900/20", icon: Play },
    done: { label: "Завершено", color: "text-green-400 bg-green-900/20", icon: CheckCircle },
  };

  const machineUtilization = Math.min(40 + (progress / 100) * 45, 85);

  return (
    <div className="space-y-6">
      {/* Production orders */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isVisible = progress >= order.threshold;
          const currentStatus = getStatusInfo(order.status);
          const config = statusConfig[currentStatus as keyof typeof statusConfig];
          const Icon = config.icon;

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/30"
            >
              <div>
                <p className="text-sm font-medium text-slate-100">{order.id}</p>
              </div>
              <div
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${config.color}`}
              >
                <Icon className="w-3 h-3" />
                {config.label}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Machine utilization */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Загрузка Линии А</p>
          <p className="text-sm font-medium text-teal-400">{Math.round(machineUtilization)}%</p>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full"
            animate={{ width: `${machineUtilization}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
