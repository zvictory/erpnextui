"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { fadeUp, stagger } from "./motion-variants";

const testimonials = [
  {
    name: "Азиз Рахимов",
    role: "CEO, SilkRoad Logistics",
    quote:
      "Мы пробовали 1С и Odoo, но только Stable ERP смогли адаптировать систему под наши сложные процессы таможенной очистки.",
    initials: "АР",
  },
  {
    name: "Елена Смирнова",
    role: "Директор Производства",
    quote:
      "Визуализация производства помогла нам сократить простои на 20% за первый месяц. Интерфейс просто космический.",
    initials: "ЕС",
  },
  {
    name: "Рустам Алиев",
    role: "Менеджер Снабжения",
    quote:
      "Отличная поддержка. Внедрили модуль Landed Cost именно так, как требовали наши бухгалтеры. Теперь считаем себестоимость до копейки.",
    initials: "РА",
  },
];

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="bg-slate-950 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="mx-auto max-w-2xl text-center text-3xl font-bold text-white sm:text-4xl"
        >
          Нам доверяют лидеры индустрии
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-16 grid gap-8 md:grid-cols-3"
        >
          {testimonials.map((t) => (
            <motion.div
              key={t.name}
              variants={fadeUp}
              whileHover={{ y: -4, transition: { type: "spring", stiffness: 300 } }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-500/20 text-sm font-medium text-teal-400">
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{t.name}</div>
                  <div className="text-xs text-slate-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
