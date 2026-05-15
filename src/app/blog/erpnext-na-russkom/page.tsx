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
                Обзор
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                28 марта 2026
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                10 мин
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
              ERPNext на русском языке: полный обзор возможностей
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-400">
              ERPNext — бесплатная ERP-система с открытым кодом. Она используется тысячами компаний
              по всему миру. Но можно ли использовать её на русском и подойдёт ли она для бизнеса в
              Центральной Азии?
            </p>
          </motion.div>

          <motion.div variants={fadeUp} className="prose-invert mt-10 space-y-8">
            <section>
              <h2 className="text-xl font-bold text-white">Что такое ERPNext</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                ERPNext — это полнофункциональная ERP-система с открытым исходным кодом, созданная
                компанией Frappe Technologies (Индия). На GitHub у проекта более 15 000 звёзд, и он
                активно развивается сообществом разработчиков по всему миру.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                ERPNext включает модули для бухгалтерии, складского учёта, продаж, закупок,
                производства, HR и управления проектами. Это конкурент SAP, Oracle и 1C — но
                бесплатный и с открытым кодом.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">
                Проблемы ERPNext для русскоязычных пользователей
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                При всей мощности ERPNext, у русскоязычных пользователей возникают типичные
                проблемы:
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Интерфейс переведён частично — многие термины остаются на английском",
                  "Сложный интерфейс — разработан для технических специалистов, не для владельцев бизнеса",
                  "Нет локальных интеграций — курсы ЦБУ, местные платёжные системы, Telegram-уведомления",
                  "Требует IT-специалиста для установки и настройки",
                  "Нет поддержки на русском языке",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Как Stable ERP решает эти проблемы</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">
                Stable ERP — это современный интерфейс поверх ERPNext, созданный специально для
                бизнеса в Центральной Азии. Под капотом работает полноценный ERPNext, но
                пользователь видит простой и понятный интерфейс:
              </p>
              <div className="mt-4 space-y-2">
                {[
                  "Полный интерфейс на русском и узбекском языках",
                  "Упрощённая навигация — только нужные функции, без перегрузки",
                  "Автоматические курсы валют от ЦБУ",
                  "Работает в браузере — ничего не нужно устанавливать",
                  "Мобильная версия — управляйте бизнесом с телефона",
                  "Техподдержка через Telegram на русском языке",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Модули Stable ERP</h2>
              <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/50">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Модуль</th>
                      <th className="px-4 py-3 text-left font-medium text-slate-400">Функции</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {[
                      ["Финансы", "P&L, баланс, главная книга, журнальные проводки"],
                      ["Склад", "Остатки, перемещения, серийный учёт, инвентаризация"],
                      ["Продажи", "Счета, заказы, котировки, дебиторка"],
                      ["Закупки", "Заказы поставщикам, кредиторка, история закупок"],
                      ["Производство", "Спецификации, рабочие наряды, рабочие центры"],
                      ["Отчёты", "Прибыль/убыток, баланс, анализ продаж, GL"],
                    ].map(([mod, desc], i) => (
                      <tr key={mod} className={i < 5 ? "border-b border-white/5" : ""}>
                        <td className="px-4 py-3 font-medium text-teal-400">{mod}</td>
                        <td className="px-4 py-3">{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white">Для кого подходит Stable ERP</h2>
              <div className="mt-4 space-y-2">
                {[
                  "Производственные компании — учёт материалов, готовой продукции, серийных номеров",
                  "Торговые компании — полный цикл от закупки до продажи",
                  "Компании услуг — финансовый учёт, управление проектами",
                  "Дистрибьюторы — множество складов, маршрутизация, мультивалюта",
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
              Попробуйте ERPNext с русским интерфейсом
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              14 дней бесплатно. Без привязки карты. Настройка за 5 минут.
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="mt-6">
              <Link
                href="/register"
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
