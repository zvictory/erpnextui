"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, CheckCircle } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function ArticlePage() {
  return (
    <>
      <Navigation />

      <article className="bg-slate-950 pb-16 pt-28">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-2xl px-4 sm:px-6"
        >
          <motion.div variants={fadeUp}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Блог
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-6">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-medium text-teal-400">
                Кейс
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                20 марта 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />8 мин
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Автоматизация склада: от Excel к ERP за 5 дней
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Реальный опыт производственной компании из Ташкента, которая перевела складской учёт
              из Excel в Stable ERP за 5 рабочих дней.
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="prose-invert mt-10 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-white">Исходная ситуация</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Производственная компания в Ташкенте: 2 склада, ~500 наименований товаров, 8
                сотрудников. Весь учёт — в нескольких файлах Excel на Google Drive. Проблемы:
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Остатки расходились с реальностью на 10-15%",
                  "Приёмка товара отражалась в системе с задержкой 1-2 дня",
                  "Невозможно было узнать себестоимость продукции в реальном времени",
                  "Инвентаризация занимала 2 дня каждый месяц",
                  "При переводе между складами товар «терялся» на 3-4 дня",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">План перехода: 5 дней</h2>
              <div className="mt-4 space-y-4">
                {[
                  {
                    day: "День 1",
                    title: "Регистрация и базовая настройка",
                    desc: "Зарегистрировались в Stable ERP, настроили компанию, валюты (UZS + USD), создали 2 склада.",
                  },
                  {
                    day: "День 2",
                    title: "Импорт номенклатуры",
                    desc: "Загрузили 500 товаров из Excel через ERPNext Data Import. Настроили группы товаров и единицы измерения.",
                  },
                  {
                    day: "День 3",
                    title: "Начальные остатки",
                    desc: "Провели Stock Entry (Material Receipt) для каждого склада. Остатки совпали с последней инвентаризацией.",
                  },
                  {
                    day: "День 4",
                    title: "Обучение команды",
                    desc: "Показали кладовщикам, как принимать товар, делать перемещения и отгрузки. 30 минут — каждый мог работать самостоятельно.",
                  },
                  {
                    day: "День 5",
                    title: "Переход на рабочий режим",
                    desc: "Отказались от Excel. Все операции — только через Stable ERP. Остатки обновляются в реальном времени.",
                  },
                ].map((step) => (
                  <div
                    key={step.day}
                    className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-teal-500/20 px-2.5 py-0.5 text-xs font-bold text-teal-400">
                        {step.day}
                      </span>
                      <h3 className="text-sm font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Результаты через месяц</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { metric: "Точность остатков", before: "85-90%", after: "99%" },
                  { metric: "Время приёмки", before: "1-2 дня задержки", after: "Моментально" },
                  { metric: "Инвентаризация", before: "2 дня/месяц", after: "30 минут/месяц" },
                  {
                    metric: "Перемещение между складами",
                    before: "3-4 дня «в пути»",
                    after: "Отражается сразу",
                  },
                ].map((r) => (
                  <div
                    key={r.metric}
                    className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
                  >
                    <p className="text-xs font-medium text-slate-500">{r.metric}</p>
                    <p className="mt-1 text-xs text-red-400 line-through">{r.before}</p>
                    <p className="text-sm font-bold text-teal-400">{r.after}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Ключевые уроки</h2>
              <div className="mt-4 space-y-2">
                {[
                  "Не пытайтесь перенести всё сразу — начните со склада, потом добавьте финансы",
                  "Начальные остатки должны быть точными — сделайте инвентаризацию перед импортом",
                  "Обучение = 30 минут для каждого сотрудника. Интерфейс Stable ERP интуитивный",
                  "Откажитесь от Excel полностью — если оставить «запасной» вариант, команда не перейдёт",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            className="mt-12 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-950/50 to-slate-900 p-8 text-center"
          >
            <h3 className="text-lg font-bold text-white">Готовы навести порядок на складе?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Начните с бесплатного 14-дневного периода. Ваш склад будет под контролем за 5 дней.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mt-6">
              <Link
                href="/register?plan=starter"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-600"
              >
                Начать бесплатно
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Все статьи
            </Link>
          </motion.div>
        </motion.div>
      </article>
    </>
  );
}
