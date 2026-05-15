"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, CheckCircle } from "lucide-react";
import { Navigation } from "@/components/landing/navigation";
import type { Metadata } from "next";

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
          {/* Breadcrumb */}
          <motion.div variants={fadeUp}>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-teal-400"
            >
              <ArrowLeft className="h-4 w-4" />
              Блог
            </Link>
          </motion.div>

          {/* Header */}
          <motion.div variants={fadeUp} className="mt-6">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 font-medium text-teal-400">
                Руководство
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />1 апреля 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />7 мин
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              ERP для малого бизнеса: зачем нужна и как выбрать
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              Если вы управляете бизнесом через Excel, WhatsApp и бумажные записи — вы теряете
              деньги, время и контроль. ERP-система решает это за вас.
            </p>
          </motion.div>

          {/* Content */}
          <motion.div variants={fadeUp} className="prose-invert mt-10 space-y-8">
            {/* Section 1 */}
            <section>
              <h2 className="text-xl font-bold text-white">Что такое ERP простыми словами</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                ERP (Enterprise Resource Planning) — это единая система для управления всем
                бизнесом: финансами, складом, продажами, закупками и производством. Вместо десятка
                разных программ и таблиц — один инструмент, где всё связано между собой.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Когда вы выставляете счёт клиенту — склад автоматически обновляется. Когда
                принимаете товар от поставщика — кредиторская задолженность растёт. Когда
                производите продукцию — сырьё списывается, а готовый товар приходуется.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-xl font-bold text-white">
                5 признаков, что вашему бизнесу нужна ERP
              </h2>
              <div className="mt-4 space-y-3">
                {[
                  "Вы не знаете реальную прибыль до конца месяца",
                  "Остатки на складе не сходятся с реальностью",
                  "Бухгалтер — единственный, кто знает финансовое состояние",
                  "Дебиторку отслеживаете в блокноте или Excel",
                  "Каждый счёт делаете вручную в Word",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">
                Если хотя бы 2 пункта про вас — ERP окупится в первый месяц за счёт экономии времени
                и снижения ошибок.
              </p>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-xl font-bold text-white">Какие функции нужны малому бизнесу</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Не все модули нужны сразу. Вот что действительно важно на старте:
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Модуль</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Что решает</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-teal-400">Финансы</td>
                      <td className="px-4 py-3">P&L, баланс, денежный поток в реальном времени</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-teal-400">Склад</td>
                      <td className="px-4 py-3">Остатки, перемещения, инвентаризация</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3 font-medium text-teal-400">Продажи</td>
                      <td className="px-4 py-3">Счета, заказы, дебиторка клиентов</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium text-teal-400">Закупки</td>
                      <td className="px-4 py-3">Заказы поставщикам, кредиторка, себестоимость</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-xl font-bold text-white">Сколько стоит ERP для малого бизнеса</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Разброс цен огромный — от бесплатных решений до миллионов. Вот реальная картина:
              </p>
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Система</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Стоимость</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Подходит</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3">1C</td>
                      <td className="px-4 py-3">от $500/мес</td>
                      <td className="px-4 py-3">Крупный бизнес, Россия</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3">SAP Business One</td>
                      <td className="px-4 py-3">от $1500/мес</td>
                      <td className="px-4 py-3">Средний/крупный бизнес</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-4 py-3">Odoo</td>
                      <td className="px-4 py-3">от $100/мес</td>
                      <td className="px-4 py-3">Малый/средний, но сложно</td>
                    </tr>
                    <tr className="border-b border-white/5 bg-teal-500/5">
                      <td className="px-4 py-3 font-medium text-teal-400">Stable ERP</td>
                      <td className="px-4 py-3 text-teal-400">от $50/мес</td>
                      <td className="px-4 py-3 text-teal-400">Малый бизнес, русский язык</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Excel</td>
                      <td className="px-4 py-3">«Бесплатно»</td>
                      <td className="px-4 py-3">Никому (скрытые затраты огромны)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-xl font-bold text-white">Почему Stable ERP</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Stable ERP — это современный интерфейс поверх ERPNext, одной из самых популярных
                open-source ERP-систем в мире (15 000+ звёзд на GitHub). Мы убрали сложность и
                оставили то, что нужно малому бизнесу:
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Интерфейс на русском языке — без IT-специалиста",
                  "Мультивалюта (UZS, USD, RUB) с автоматическими курсами",
                  "Работает с телефона — не нужен компьютер",
                  "Настройка за 5 минут, не за 5 месяцев",
                  "От $50/месяц — дешевле штатного бухгалтера",
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
            <h3 className="text-lg font-bold text-white">
              Попробуйте Stable ERP бесплатно 14 дней
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Без привязки карты. Настройка занимает меньше 5 минут.
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

          {/* Back to blog */}
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
