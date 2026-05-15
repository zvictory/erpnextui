"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Rocket, CheckCircle, Calendar, Send } from "lucide-react";
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

export default function QuickStartPage() {
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
            <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-3 py-1 text-sm text-teal-400">
              <Rocket className="h-4 w-4" />
              Быстрый старт
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              Ваш бизнес на ERP за 7 дней
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Если вы всё ещё ведёте бизнес в Excel, вы каждый день теряете деньги, которые не
              можете посчитать. За 7 дней я переведу ваш учёт — финансы, склад, продажи, долги — в
              современную ERP-систему, которую поймёт каждый сотрудник без обучения.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">$2,000</span>
                <span className="text-sm text-slate-400">разово + подписка от $50/мес</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Это меньше, чем вы теряете за один месяц на ошибках в Excel.
              </p>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeUp} className="mt-10 space-y-10">
            {/* What's included */}
            <section>
              <h2 className="text-xl font-bold text-white">Что входит</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Два видеозвонка (настройка + обучение), асинхронная поддержка в Telegram на
                протяжении 30 дней. Результат — ваш бизнес полностью работает в ERP, Excel остаётся
                в прошлом.
              </p>
            </section>

            {/* 7-Day Timeline */}
            <section>
              <h2 className="text-xl font-bold text-white">7 дней до результата</h2>
              <div className="mt-6 space-y-4">
                {[
                  {
                    days: "День 1-2",
                    title: "Настройка компании",
                    desc: "Конфигурация компании, план счетов, валюты (UZS, USD, RUB), курсы обмена. Создаём склады и подразделения.",
                  },
                  {
                    days: "День 3-4",
                    title: "Импорт данных из Excel",
                    desc: "Все товары, клиенты и поставщики перенесены из ваших таблиц. Настроены группы, единицы измерения, цены.",
                  },
                  {
                    days: "День 5",
                    title: "Начальные остатки",
                    desc: "Ввод фактических остатков на складе и финансовых балансов. ERP-система отражает реальное состояние вашего бизнеса.",
                  },
                  {
                    days: "День 6",
                    title: "Обучение команды",
                    desc: "30 минут на каждую роль — кладовщик, менеджер, бухгалтер. Каждый сотрудник сможет работать самостоятельно.",
                  },
                  {
                    days: "День 7",
                    title: "Запуск",
                    desc: "Переход на рабочий режим. Excel выключен, все операции — через Stable ERP. Вы видите полную картину бизнеса.",
                  },
                  {
                    days: "День 8-37",
                    title: "Приоритетная поддержка",
                    desc: "30 дней поддержки через Telegram. Любой вопрос — ответ в течение 2 часов в рабочее время.",
                  },
                ].map((step) => (
                  <div
                    key={step.days}
                    className="rounded-xl border border-white/10 bg-slate-900/50 p-5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-400">
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
                  "Владельцы малого бизнеса, которые хотят навести порядок",
                  "Компании, которые уже пробовали внедрить ERP самостоятельно — и застряли",
                  "Руководители, которым нужен результат, а не эксперименты",
                  "Торговые и производственные компании с 5-50 сотрудниками",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* What you get on Day 8 */}
            <section>
              <h2 className="text-xl font-bold text-white">Что вы увидите на 8-й день</h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { label: "Прибыль", desc: "P&L в реальном времени" },
                  { label: "Склад", desc: "Точные остатки по товарам" },
                  { label: "Дебиторка", desc: "Кто и сколько вам должен" },
                  { label: "Кредиторка", desc: "Кому и сколько должны вы" },
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
            className="mt-12 rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-950/50 to-slate-900 p-8 text-center"
          >
            <h3 className="text-lg font-bold text-white">Готовы начать?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Напишите в Telegram — обсудим ваш бизнес и составим план перехода за 15 минут.
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
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                >
                  Или начать самостоятельно
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
