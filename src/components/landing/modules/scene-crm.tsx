import { motion } from 'framer-motion';

interface SceneCRMProps {
  progress: number;
}

export function SceneCRM({ progress }: SceneCRMProps) {
  const leads = Math.floor((Math.min(progress, 60) / 60) * 48);
  const negotiations = Math.floor((Math.min(progress, 60) / 60) * 21);
  const deals = Math.floor((Math.min(progress, 60) / 60) * 9);
  const pipelineValue = Math.floor((Math.min(progress, 60) / 60) * 142000000);
  const winRate = Math.floor((Math.min(progress, 80) / 80) * 42);

  const funnelStages = [
    { label: 'Лиды', count: leads, width: 100, color: 'from-blue-500 to-blue-400' },
    { label: 'Переговоры', count: negotiations, width: 44, color: 'from-purple-500 to-purple-400' },
    { label: 'Сделки', count: deals, width: 19, color: 'from-green-500 to-green-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Sales funnel */}
      <div className="space-y-3">
        {funnelStages.map((stage) => (
          <motion.div key={stage.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">{stage.label}</p>
              <p className="text-xs font-medium text-slate-100">{stage.count}</p>
            </div>
            <motion.div
              className={`h-8 rounded-lg bg-gradient-to-r ${stage.color} flex items-center justify-center`}
              initial={{ width: 0 }}
              animate={{ width: `${stage.width}%` }}
              transition={{ duration: 0.6 }}
            >
              {stage.width > 30 && (
                <p className="text-xs font-bold text-white">{stage.count}</p>
              )}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Pipeline value */}
      {progress >= 30 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-slate-700 bg-slate-800/50"
        >
          <p className="text-xs text-slate-400 mb-1">Стоимость сделок</p>
          <p className="text-2xl font-bold text-slate-100">
            {(pipelineValue / 1000000).toFixed(0)}M сўм
          </p>
        </motion.div>
      )}

      {/* Win rate gauge */}
      {progress >= 50 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Процент закрытия</p>
            <p className="text-lg font-bold text-green-400">{winRate}%</p>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
              animate={{ width: `${winRate}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}
