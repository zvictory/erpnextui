"use client";

import { motion } from "framer-motion";
import { X, CheckCircle } from "lucide-react";
import { fadeUp, stagger, slideLeft, slideRight } from "./motion-variants";

const problems = [
  "Ручной перенос данных между системами",
  "Ошибки при вводе данных",
  "Невозможность получить отчёт в реальном времени",
  "Высокая стоимость поддержки нескольких систем",
];

const solutions = [
  "Автоматическая синхронизация всех данных",
  "Единый источник правды для всех отделов",
  "Отчёты и аналитика в реальном времени",
  "Одна система — одна стоимость поддержки",
];

export function ProblemSection() {
  return (
    <section className="bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-8 lg:grid-cols-2"
        >
          {/* Problem */}
          <motion.div
            variants={slideLeft}
            className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8"
          >
            <h3 className="text-xl font-semibold text-white">Фрагментированные данные</h3>
            <p className="mt-3 leading-relaxed text-slate-300">
              Потеря информации между системами, ручной ввод, дублирование данных и ошибки. Каждый
              отдел работает в своей программе.
            </p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="mt-6 space-y-3"
            >
              {problems.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <X className="h-4 w-4 shrink-0 text-red-400" />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Solution */}
          <motion.div
            variants={slideRight}
            className="rounded-2xl border border-teal-500/20 bg-teal-950/20 p-8"
          >
            <h3 className="text-xl font-semibold text-white">Единая Экосистема</h3>
            <p className="mt-3 leading-relaxed text-slate-300">
              Бесшовный поток данных от станка до финансового отчёта. Все модули работают в единой
              системе — изменение в одном месте мгновенно отражается везде.
            </p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="mt-6 space-y-3"
            >
              {solutions.map((item) => (
                <motion.div
                  key={item}
                  variants={fadeUp}
                  className="flex items-center gap-2 text-sm text-slate-300"
                >
                  <CheckCircle className="h-4 w-4 shrink-0 text-teal-500" />
                  {item}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
