import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface SceneWarehouseProps {
  progress: number;
}

export function SceneWarehouse({ progress }: SceneWarehouseProps) {
  const items = [
    {
      name: 'Мороженое Ваниль',
      stock: 1250,
      status: 'normal',
      threshold: 0,
    },
    {
      name: 'Упаковка',
      stock: 45000,
      status: 'normal',
      threshold: 25,
    },
    {
      name: 'Сахар',
      stock: 3500,
      status: 'critical',
      threshold: 50,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Inventory table */}
      <div className="space-y-3">
        {items.map((item, i) => {
          const isVisible = progress >= item.threshold;
          const statusColor = item.status === 'normal' ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20';
          const statusLabel = item.status === 'normal' ? 'Норма' : 'Критично';

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -20 }}
              className="flex items-center justify-between p-3 rounded-lg border border-slate-700 bg-slate-900/30"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-100">{item.name}</p>
                <p className="text-xs text-slate-400">{item.stock.toLocaleString('ru-RU')} шт</p>
              </div>
              <div className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${statusColor}`}>
                {item.status === 'normal' ? (
                  <CheckCircle className="w-3 h-3" />
                ) : (
                  <AlertCircle className="w-3 h-3" />
                )}
                {statusLabel}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Incoming shipment notification */}
      {progress >= 70 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-lg border border-blue-700 bg-blue-900/20"
        >
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-200">
            <span className="font-medium">Входящая поставка:</span> 500 кг Сахара
          </p>
        </motion.div>
      )}
    </div>
  );
}
