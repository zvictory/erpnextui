"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Rocket, Crown, CheckCircle, EyeOff, Eye, Send } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";
import { FooterSection } from "@/components/landing/footer-section";

/* ─── Motion variants ──────────────────────────────────────────────── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

/* ─── Page ─────────────────────────────────────────────────────────── */

export default function ServicesPage() {
  return (
    <>
      <Navigation />

      {/* Hero — Transformation */}
      <section className="relative overflow-hidden bg-slate-950 pb-16 pt-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-900/20 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative mx-auto max-w-3xl px-4 text-center sm:px-6"
        >
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-bold leading-tight text-white sm:text-5xl"
          >
            От хаоса в Excel — к{" "}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              полной прозрачности
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-6 text-lg leading-relaxed text-slate-400">
            Вы управляете бизнесом вслепую — не знаете реальную прибыль, не доверяете остаткам на
            складе, и каждый месяц ждёте отчёт от бухгалтера. Stable ERP даёт вам полную картину
            бизнеса в реальном времени: прибыль, склад, долги — на экране телефона, на русском
            языке.
          </motion.p>
        </motion.div>
      </section>

      {/* Before / After */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-2xl border border-red-500/20 bg-red-950/20 p-8"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-2">
                  <EyeOff className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Сейчас: вслепую</h3>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Не знаете реальную прибыль до конца месяца",
                  "Звоните на склад: «Сколько осталось?» — каждый раз разный ответ",
                  "Долги в блокноте или WhatsApp — никто не знает точную сумму",
                  "Каждый счёт делаете вручную в Word — 20-30 минут",
                  "Теряете 5-15% товара: усушка, пересортица, воровство",
                  "Тратите 10+ часов в неделю на рутину, которая должна занимать минуты",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-2xl border border-teal-500/20 bg-teal-950/20 p-8"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-teal-500/10 p-2">
                  <Eye className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-white">После: полная прозрачность</h3>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Открываете телефон → видите P&L, кэш и маржу за сегодня",
                  "Точные остатки по товару, складу и серийному номеру",
                  "Кто должен вам, сколько и как давно — на одном экране",
                  "Счёт создаётся за 2 минуты и автоматически списывает товар",
                  "Решения на основе данных, а не догадок",
                  "Экономите 10+ часов в неделю — тратите их на рост бизнеса",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3 Tiers */}
      <section className="bg-slate-950 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="text-center"
          >
            <motion.h2 variants={fadeUp} className="text-3xl font-bold text-white sm:text-4xl">
              Выберите свой путь
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-400">
              Начните бесплатно за 5 минут или позвольте нам настроить всё за вас
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mt-16 grid gap-8 lg:grid-cols-3"
          >
            {/* Tier 1 — Self-serve */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-8"
            >
              <div className="mb-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <Zap className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Прозрачность</h3>
                <p className="mt-1 text-sm text-teal-400">Самостоятельно</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">от $50</span>
                  <span className="text-sm text-slate-400">/мес</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  14 дней бесплатно. Без привязки карты.
                </p>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                Видите прибыль, остатки и долги в реальном времени — с телефона. Зарегистрируйтесь,
                настройте компанию и начните работать за 5 минут.
              </p>

              <div className="mb-8 space-y-2">
                {[
                  "Финансы, склад, продажи, закупки",
                  "Мульти-валюта (UZS, USD, RUB)",
                  "Работает с телефона",
                  "Интерфейс на русском языке",
                  "Telegram-поддержка",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/register"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Начать бесплатно
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Tier 2 — Quick Start */}
            <motion.div
              variants={fadeUp}
              className="relative flex flex-col rounded-2xl border border-teal-500/50 bg-gradient-to-b from-teal-500/10 to-slate-900/50 p-8 shadow-lg shadow-teal-500/10"
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-teal-500 px-4 py-1 text-xs font-semibold text-white">
                  Популярный
                </span>
              </div>

              <div className="mb-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400">
                  <Rocket className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Быстрый старт</h3>
                <p className="mt-1 text-sm text-teal-400">Сделаем вместе за 7 дней</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$2,000</span>
                  <span className="text-sm text-slate-400">разово</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">+ подписка от $50/мес после настройки</p>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                За 7 дней я переведу ваш бизнес с Excel и блокнотов на ERP-систему, которую поймёт
                каждый сотрудник. На 8-й день вы увидите реальную картину бизнеса.
              </p>

              <div className="mb-8 space-y-2">
                {[
                  "Настройка компании и валют",
                  "Импорт товаров, клиентов, поставщиков из Excel",
                  "Ввод начальных остатков",
                  "Обучение команды (30 мин на сотрудника)",
                  "30 дней приоритетной поддержки",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/services/quick-start"
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-teal-500/25 transition-colors hover:bg-teal-600"
                  >
                    Подробнее
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>

            {/* Tier 3 — Full Control */}
            <motion.div
              variants={fadeUp}
              className="flex flex-col rounded-2xl border border-white/10 bg-slate-900/50 p-8"
            >
              <div className="mb-6">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                  <Crown className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">Полный контроль</h3>
                <p className="mt-1 text-sm text-teal-400">Сделаем за вас за 14 дней</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">$6,500</span>
                  <span className="text-sm text-slate-400">разово</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  + подписка от $100/мес после настройки
                </p>
              </div>

              <p className="mb-6 text-sm leading-relaxed text-slate-300">
                Через 14 дней ваш бизнес будет на современной ERP. Вам не нужно ничего настраивать —
                я сделаю всё за вас. Вы просто откроете телефон и увидите полную картину.
              </p>

              <div className="mb-8 space-y-2">
                {[
                  "Всё из «Быстрый старт»",
                  "Кастомные отчёты и дашборды",
                  "Настройка производственных процессов",
                  "Мульти-складская конфигурация",
                  "60 дней приоритетной поддержки",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-auto">
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/services/full-control"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
                  >
                    Подробнее
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-slate-950 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="rounded-2xl border border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 p-8 sm:p-12"
          >
            <h3 className="text-xl font-bold text-white">Не уверены, какой вариант выбрать?</h3>
            <p className="mt-2 text-sm text-slate-400">
              Напишите в Telegram — подскажу лучший вариант для вашего бизнеса за 5 минут.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mt-6">
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
          </motion.div>
        </div>
      </section>

      <FooterSection />
    </>
  );
}
