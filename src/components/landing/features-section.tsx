"use client";

import { motion } from "framer-motion";
import {
  Calculator,
  Package,
  Factory,
  Users,
  ShoppingCart,
  UserCog,
  ArrowRight,
} from "lucide-react";
import { fadeUp, stagger } from "./motion-variants";

const modules = [
  {
    icon: Calculator,
    title: "Финансы и Бухгалтерия",
    description: "P&L, Cashflow, мульти-валюта, автоматические проводки и сверки.",
    color: "bg-teal-500/10 text-teal-500",
  },
  {
    icon: Package,
    title: "Склад и Логистика",
    description: "Мульти-склад, WMS, отслеживание партий и серийных номеров.",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    icon: Factory,
    title: "Производство",
    description: "BOM, маршруты, планирование заказов, контроль загрузки линий.",
    color: "bg-orange-500/10 text-orange-500",
  },
  {
    icon: Users,
    title: "CRM и Продажи",
    description: "Воронка продаж, IP-телефония, аналитика. От лида до сделки.",
    color: "bg-purple-500/10 text-purple-500",
  },
  {
    icon: ShoppingCart,
    title: "Закупки и Снабжение",
    description: "Landed Cost, автозакупки, учёт фрахта и пошлин.",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    icon: UserCog,
    title: "HR и Кадры",
    description: "Управление персоналом, табели, зарплаты, отпуска.",
    color: "bg-rose-500/10 text-rose-500",
  },
];

export function FeaturesSection() {
  return (
    <section id="modules" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-slate-900 sm:text-4xl">
            Все модули для вашего бизнеса
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            Модульная архитектура — подключайте только то, что нужно
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {modules.map((mod) => (
            <motion.div
              key={mod.title}
              variants={fadeUp}
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 300, damping: 20 } }}
              className="group cursor-default rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/5"
            >
              <div className={`inline-flex rounded-xl p-3 ${mod.color}`}>
                <mod.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{mod.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{mod.description}</p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-teal-600 opacity-0 transition-opacity group-hover:opacity-100">
                Подробнее <ArrowRight className="h-3 w-3" />
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
