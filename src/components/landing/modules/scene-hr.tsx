import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface SceneHRProps {
  progress: number;
}

export function SceneHR({ progress }: SceneHRProps) {
  const attendanceData = [95, 92, 98, 88, 94, 91, 96, 93, 89, 97, 90, 92];

  return (
    <div className="space-y-6">
      {/* Employee count */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center p-4 rounded-lg border border-slate-700 bg-slate-800/50"
      >
        <p className="text-xs text-slate-400 mb-1">Штат сотрудников</p>
        <p className="text-3xl font-bold text-teal-400">34</p>
        <p className="text-xs text-slate-400 mt-1">сотрудника</p>
      </motion.div>

      {/* Attendance chart */}
      <div className="space-y-2">
        <p className="text-sm text-slate-400">Посещаемость (май)</p>
        <div className="flex items-end gap-1.5 h-32 bg-slate-900/30 rounded p-3">
          {attendanceData.map((attendance, i) => {
            const animatedHeight = Math.min(progress, 100) * (attendance / 100);
            return (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-teal-500 to-teal-400 rounded-t"
                style={{ height: `${animatedHeight}%`, minHeight: "2px" }}
              />
            );
          })}
        </div>
      </div>

      {/* Salary summary */}
      {progress >= 50 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg border border-slate-700 bg-slate-800/50"
        >
          <p className="text-xs text-slate-400 mb-1">Фонд оплаты труда</p>
          <p className="text-2xl font-bold text-slate-100 mb-1">68 000 000 сўм</p>
          <p className="text-xs text-slate-500">за май</p>
        </motion.div>
      )}

      {/* Leave requests */}
      {progress >= 70 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-lg border border-blue-700 bg-blue-900/20"
        >
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-200">
            <span className="font-medium">2 заявки на отпуск</span> ожидают
          </p>
        </motion.div>
      )}
    </div>
  );
}
