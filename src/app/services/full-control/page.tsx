"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Crown, CheckCircle, Calendar, Send, Shield } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";

/* ─── Motion variants ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function FullControlPage() {
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
          {/* Breadcrumb */}
          <motion.div variants={fadeUp}>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Все услуги
            </Link>
          </motion.div>

          {/* Hero */}
          <motion.div variants={fadeUp} className="mt-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-sm text-amber-400">
              <Crown className="h-4 w-4" />
              Полный контроль
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Полная оцифровка бизнеса за 14 дней
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Ваш бизнес заслуживает системы, а не хаоса из WhatsApp, блокнотов и таблиц. За 14 дней
              я полностью оцифрую ваш бизнес: товары, склады, клиенты, финансы, производство — всё
              будет в одной системе. Вам не нужно ничего изучать — я настрою, импортирую данные,
              обучу команду и буду на связи 60 дней.
            </p>

            <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-950/20 p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">$6,500</span>
                <span className="text-sm text-slate-400">разово + подписка от $100/мес</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Это меньше, чем один месяц потерь от невидимого воровства, пересортицы и ошибок.
              </p>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeUp} className="mt-10 space-y-10">
            {/* What makes this different */}
            <section>
              <h2 className="text-xl font-bold text-white">Чем отличается от «Быстрого старта»</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                «Быстрый старт» — это базовая настройка, которой достаточно для торговли и простого
                учёта. «Полный контроль» — это глубокое внедрение для сложных бизнесов:
                производство, несколько складов, кастомные отчёты, автоматизация процессов.
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Настройка производственных процессов (BOM, Work Orders, рабочие центры)",
                  "Мульти-складская конфигурация с маршрутизацией",
                  "Кастомные отчёты и дашборды под ваш бизнес",
                  "Настройка workflow: согласования, уведомления, автоматические действия",
                  "Глубокий импорт исторических данных",
                  "60 дней приоритетной поддержки (ответ за 2 часа)",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 14-Day Timeline */}
            <section>
              <h2 className="text-xl font-bold text-white">14 дней до полной оцифровки</h2>
              <div className="mt-6 space-y-4">
                {[
                  {
                    days: "Неделя 1",
                    title: "Весь бизнес в системе",
                    desc: "Конфигурация компании, импорт всех данных (товары, клиенты, поставщики, остатки, склады). Настройка плана счетов, валют и курсов. К концу недели — ваш бизнес полностью отражён в ERP.",
                  },
                  {
                    days: "Неделя 2",
                    title: "Процессы и автоматизация",
                    desc: "Настройка производственных модулей, кастомных отчётов, workflow. Обучение каждой роли в команде. Пилотный запуск параллельно с текущими процессами.",
                  },
                  {
                    days: "День 15",
                    title: "Запуск",
                    desc: "Переход на ERP в рабочем режиме. Вы впервые видите полную картину бизнеса на одном экране: прибыль, склад, долги, загрузку производства.",
                  },
                  {
                    days: "60 дней",
                    title: "Приоритетная поддержка",
                    desc: "Любой вопрос — ответ в течение 2 часов. Донастройка отчётов, помощь с нестандартными ситуациями, оптимизация процессов.",
                  },
                ].map((step) => (
                  <div
                    key={step.days}
                    className="rounded-xl border border-white/10 bg-slate-900/50 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400">
                        <Calendar className="h-3 w-3" />
                        {step.days}
                      </span>
                      <h3 className="text-sm font-bold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{step.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Who is this for */}
            <section>
              <h2 className="text-xl font-bold text-white">Для кого</h2>
              <div className="mt-4 space-y-2">
                {[
                  "Производственные компании — учёт сырья, BOM, рабочие наряды, OEE",
                  "Мульти-локационный бизнес — несколько складов, филиалов",
                  "Владельцы, которые не хотят разбираться в IT — нужен готовый результат",
                  "Компании с 20-50+ сотрудниками, где хаос стоит дорого",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* ROI */}
            <section>
              <h2 className="text-xl font-bold text-white">Окупаемость</h2>
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50 p-6">
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-teal-400" />
                  <div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Производственная компания с оборотом $100,000/мес теряет 5-15% на усушке,
                      пересортице и невидимых ошибках — это{" "}
                      <span className="font-bold text-white">$5,000-15,000/мес</span> потерь.
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      $6,500 за внедрение окупается{" "}
                      <span className="font-bold text-teal-400">за первый месяц</span> только за
                      счёт точного учёта — без учёта экономии времени.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* What you get */}
            <section>
              <h2 className="text-xl font-bold text-white">Что вы получите</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "Финансы", desc: "P&L, баланс, cashflow — в реальном времени" },
                  { label: "Склад", desc: "Точные остатки, серийные номера, инвентаризация" },
                  { label: "Производство", desc: "BOM, рабочие наряды, загрузка линий" },
                  { label: "Аналитика", desc: "Кастомные отчёты и дашборды" },
                  { label: "Продажи", desc: "Счета, заказы, дебиторка на одном экране" },
                  { label: "Команда", desc: "Обученные сотрудники, готовые работать" },
                ].map((r) => (
                  <div
                    key={r.label}
                    className="rounded-xl border border-white/10 bg-slate-900/50 p-4"
                  >
                    <p className="text-sm font-bold text-teal-400">{r.label}</p>
                    <p className="mt-1 text-xs text-slate-400">{r.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          </motion.div>

          {/* CTA */}
          <motion.div
            variants={fadeUp}
            className="mt-12 rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/30 to-slate-900 p-8 text-center"
          >
            <h3 className="text-lg font-bold text-white">Готовы оцифровать бизнес?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Напишите в Telegram — обсудим ваш бизнес, процессы и составим план внедрения.
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <a
                  href="https://t.me/stableerp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-teal-600"
                >
                  <Send className="h-4 w-4" />
                  Написать в Telegram
                </a>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Link
                  href="/services/quick-start"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  Или выбрать «Быстрый старт» за $2,000
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Все услуги
            </Link>
          </motion.div>
        </motion.div>
      </article>
    </>
  );
}
