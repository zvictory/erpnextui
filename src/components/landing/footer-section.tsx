"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Scale, Send } from "lucide-react";
import { fadeUp, stagger } from "./motion-variants";

export function FooterSection() {
  return (
    <footer id="contact" className="bg-slate-950 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-12 md:grid-cols-4"
        >
          <motion.div variants={fadeUp} className="md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500">
                <Scale className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">Stable ERP</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              Простая ERP-система на русском языке для малого и среднего бизнеса. Финансы, склад,
              производство — всё в одном месте.
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Контакты</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <p>Ташкент, Узбекистан</p>
              <p>info@stableerp.com</p>
              <a
                href="https://t.me/stableerp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-400 transition-colors hover:text-teal-400"
              >
                <Send className="h-4 w-4" />
                Telegram: @stableerp
              </a>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Компания</h3>
            <div className="mt-4 space-y-3">
              {[
                { label: "Модули", href: "/#modules" },
                { label: "Тарифы", href: "/pricing" },
                { label: "Услуги", href: "/services" },
                { label: "Кейсы", href: "/cases" },
                { label: "Блог", href: "/blog" },
                { label: "Отзывы", href: "/#testimonials" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block text-sm text-slate-400 transition-colors hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h3 className="text-sm font-semibold text-white">Ресурсы</h3>
            <div className="mt-4 space-y-3">
              <Link
                href="/register"
                className="block text-sm text-slate-400 transition-colors hover:text-white"
              >
                Регистрация
              </Link>
              <Link
                href="/login"
                className="block text-sm text-slate-400 transition-colors hover:text-white"
              >
                Войти в систему
              </Link>
              <a
                href="https://t.me/stableerp"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-slate-400 transition-colors hover:text-white"
              >
                Задать вопрос в Telegram
              </a>
            </div>
          </motion.div>
        </motion.div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Stable ERP. Все права защищены.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">
              Политика конфиденциальности
            </a>
            <a href="#" className="text-sm text-slate-500 hover:text-slate-300">
              Условия использования
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
