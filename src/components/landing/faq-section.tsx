"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { fadeUp, stagger } from "./motion-variants";

const faqItems = [
  {
    question: "Сколько стоит Stable ERP?",
    answer:
      "Мы предлагаем гибкие тарифы от бесплатного до корпоративного. Первые 14 дней — бесплатно, без привязки карты.",
    link: { label: "Подробнее о тарифах", href: "/pricing" },
  },
  {
    question: "Нужен ли бухгалтер для работы с системой?",
    answer:
      "Нет. Stable ERP создана для предпринимателей и менеджеров, а не для бухгалтеров. Простой интерфейс на русском языке, понятный без специальных знаний.",
  },
  {
    question: "Как долго длится внедрение?",
    answer:
      "Самостоятельно — от 5 минут. Регистрация, выбор модулей, начало работы. Если нужна помощь с настройкой и переносом данных — мы внедрим за 7–14 дней.",
  },
  {
    question: "Можно ли перенести данные из 1С или Excel?",
    answer:
      "Да. Мы помогаем с миграцией данных: остатки, справочники контрагентов, история операций. Перенос входит в пакет внедрения.",
  },
  {
    question: "Работает ли на телефоне?",
    answer:
      "Да, полностью адаптивный интерфейс. Вы можете проверять остатки, утверждать документы и видеть отчёты прямо с телефона.",
  },
  {
    question: "Где хранятся данные?",
    answer:
      "На облачных серверах с ежедневным резервным копированием и шифрованием. Ваши данные доступны только вам.",
  },
  {
    question: "Можно ли подключить только нужные модули?",
    answer:
      "Да. Модульная архитектура — включаете только то, что нужно вашему бизнесу. Остальное можно добавить позже.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-white py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="text-center text-3xl font-bold text-slate-900 sm:text-4xl"
        >
          Частые вопросы
        </motion.h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="mt-12 divide-y divide-slate-200"
        >
          {faqItems.map((item, index) => (
            <motion.div key={item.question} variants={fadeUp}>
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="text-base font-medium text-slate-900">{item.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <p className="pb-5 text-sm leading-relaxed text-slate-600">{item.answer}</p>
                    {item.link && (
                      <Link
                        href={item.link.href}
                        className="mb-5 inline-block text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        {item.link.label} →
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
